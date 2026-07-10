import {
  Horizon,
  Keypair,
  MemoHash,
  Transaction,
  hash,
} from "@stellar/stellar-sdk";
import { config } from "./config.js";

// Public Horizon node — used to broadcast + confirm top-up deposits and payouts.
export const horizon = new Horizon.Server(config.horizonUrl);

function decode(xdrB64: string): Transaction {
  // Login/top-up txns are always plain (non-fee-bump) transactions.
  return new Transaction(xdrB64, config.networkPassphrase);
}

/**
 * Verify a login proof: a 1-stroop self-payment signed by `address` whose memo
 * is the sha256 hash of `nonce`. We verify the ed25519 signature directly (the
 * txn is never broadcast — it just proves the user controls the address).
 */
export function verifyLoginSignature(address: string, xdrB64: string, nonce: string): boolean {
  let tx: Transaction;
  try {
    tx = decode(xdrB64);
  } catch {
    return false;
  }
  if (tx.source !== address) return false;
  // The memo must bind this signature to the issued nonce (anti-replay).
  if (tx.memo.type !== MemoHash) return false;
  const memoValue = tx.memo.value;
  if (!memoValue || !Buffer.from(memoValue as Uint8Array).equals(hash(Buffer.from(nonce)))) {
    return false;
  }
  const kp = Keypair.fromPublicKey(address);
  const signingHash = tx.hash();
  return tx.signatures.some((s) => {
    try {
      return kp.verify(signingHash, s.signature());
    } catch {
      return false;
    }
  });
}

export interface SettledTopUp {
  txid: string;
  amountStroops: number;
}

/** Convert a decimal XLM amount string (e.g. "0.5000000") to integer stroops. */
function xlmStringToStroops(amount: string): number {
  return Math.round(Number(amount) * 1e7);
}

/**
 * Broadcast + confirm a top-up: a native-XLM payment from `address` to the
 * platform custodial address. Returns the txid + amount so the caller can credit
 * the wallet (idempotently, keyed by txid). Throws on any mismatch or settle error.
 */
export async function settleTopUp(address: string, xdrB64: string): Promise<SettledTopUp> {
  if (!config.platformPayTo) {
    throw new Error("PLATFORM_PAYTO is not configured on the server");
  }
  const tx = decode(xdrB64);

  // Exactly one native payment, from the caller, to the platform address.
  const ops = tx.operations;
  const op = ops[0];
  if (
    ops.length !== 1 ||
    !op ||
    op.type !== "payment" ||
    !op.asset.isNative() ||
    op.destination !== config.platformPayTo ||
    tx.source !== address ||
    Number(op.amount) <= 0
  ) {
    throw new Error("top-up transaction must pay XLM from your wallet to the platform address");
  }

  const txid = tx.hash().toString("hex");
  try {
    await horizon.submitTransaction(tx);
  } catch (err) {
    // Tolerate an already-included txn on a retry — what matters is it confirmed.
    const existing = await horizon
      .transactions()
      .transaction(txid)
      .call()
      .catch(() => null);
    if (!existing || !existing.successful) {
      throw new Error(horizonErrorMessage(err));
    }
  }

  return { txid, amountStroops: xlmStringToStroops(op.amount) };
}

/** Best-effort extraction of a readable reason from a Horizon submit error. */
function horizonErrorMessage(err: unknown): string {
  const codes = (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })?.response
    ?.data?.extras?.result_codes;
  if (codes) return `Horizon rejected the transaction: ${JSON.stringify(codes)}`;
  return (err as Error)?.message ?? "Horizon submit failed";
}
