import { Keypair, contract } from "@stellar/stellar-sdk";
import { config } from "./config.js";

// `contract.Client`'s per-contract methods are attached dynamically at runtime
// (from the deployed contract's on-chain spec), so plain structural typing
// can't see them without codegen — this local cast just names the one method
// this file calls.
type LedgerClient = contract.Client & {
  payout(args: {
    lease_id: string;
    contributor: string;
    user: string;
    amount: bigint;
  }): Promise<contract.AssembledTransaction<null>>;
};

/**
 * Load the platform's custodial signing key from PLATFORM_PRIVATE_KEY (a Stellar
 * secret seed, S…). Lazily decoded so the backend can still boot for
 * read-only/dev use without it.
 */
function loadPlatformKey(): Keypair {
  if (!config.platformPrivateKey) {
    throw new Error("PLATFORM_PRIVATE_KEY is not configured — cannot pay contributors");
  }
  return Keypair.fromSecret(config.platformPrivateKey);
}

/** True if the backend is configured to send on-chain payouts. */
export function payoutsEnabled(): boolean {
  return !!config.platformPrivateKey && !!config.contractId;
}

/**
 * Pay a contributor their cut of a lease by calling `payout(...)` on the
 * Fallow ledger contract, signed by the platform key — the contract moves
 * `amountStroops` of native XLM from the platform's custodial address to
 * `contributorAddr` and emits a public `payout` event. The contributor's
 * account must already exist (funded via Friendbot).
 *
 * Returns the transaction hash whenever the network *accepted* the submission,
 * even if confirmation didn't come back in time. The SDK throws
 * `TransactionStillPending` / `SendResultOnly` for a transaction it has already
 * broadcast — treating that as "no payout" is how a real, settled payment ends
 * up labelled `unpaid` in spend history forever. Only a genuine send failure
 * (or a pre-send error) throws out of here.
 */
export async function payContributor(
  leaseId: string,
  contributorAddr: string,
  userAddr: string,
  amountStroops: number,
): Promise<string> {
  if (amountStroops <= 0) {
    throw new Error("payout amount must be positive");
  }
  const kp = loadPlatformKey();
  const signer = contract.basicNodeSigner(kp, config.networkPassphrase);
  const client = (await contract.Client.from({
    contractId: config.contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.sorobanRpcUrl,
    publicKey: kp.publicKey(),
    ...signer,
  })) as LedgerClient;
  const tx = await client.payout({
    lease_id: leaseId,
    contributor: contributorAddr,
    user: userAddr,
    amount: BigInt(amountStroops),
  });

  // Sign first so the hash is known locally — it's deterministic from the signed
  // envelope, so we keep it even if the confirmation poll later times out.
  await tx.sign();
  const hash = tx.signed?.hash().toString("hex");

  try {
    const sent = await tx.send();
    return sent.getTransactionResponse?.txHash ?? sent.sendTransactionResponse?.hash ?? hash ?? "";
  } catch (err) {
    // The send itself was rejected — nothing landed, so this really is unpaid.
    if (err instanceof contract.SentTransaction.Errors.SendFailed || !hash) throw err;
    // Broadcast, just not confirmed yet. Hand back the hash so the payout is
    // recorded and checkable on an explorer instead of showing as unpaid.
    console.warn(
      `[payout] lease ${leaseId}: submitted ${hash} but not confirmed in time — ${(err as Error).message}`,
    );
    return hash;
  }
}
