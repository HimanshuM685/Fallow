import { Asset, BASE_FEE, Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { config } from "./config.js";
import { horizon } from "./wallet.js";

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
  return !!config.platformPrivateKey;
}

/**
 * Send `amountStroops` XLM from the platform custodial wallet to a contributor's
 * payout address, on-chain via Horizon. Returns the confirmed txid. Throws on any
 * failure (the caller logs it and records the payout as failed — usage is still
 * billed). The contributor's account must already exist (funded via Friendbot).
 */
export async function payContributor(toAddr: string, amountStroops: number): Promise<string> {
  if (amountStroops <= 0) {
    throw new Error("payout amount must be positive");
  }
  const kp = loadPlatformKey();
  const account = await horizon.loadAccount(kp.publicKey());
  const amountXlm = (amountStroops / 1e7).toFixed(7);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      Operation.payment({ destination: toAddr, asset: Asset.native(), amount: amountXlm }),
    )
    .setTimeout(60)
    .build();

  tx.sign(kp);
  const res = await horizon.submitTransaction(tx);
  return res.hash;
}
