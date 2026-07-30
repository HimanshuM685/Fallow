import {
  Address,
  Keypair,
  MemoHash,
  Transaction,
  hash,
  rpc,
  scValToNative,
} from "@stellar/stellar-sdk";
import { config } from "./config.js";

// Soroban RPC node — used to broadcast + confirm top-up contract calls.
const soroban = new rpc.Server(config.sorobanRpcUrl);

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

/**
 * Broadcast + confirm a top-up: a `topup(from, amount)` call on the Fallow
 * ledger contract, from `address`. Returns the txid + amount so the caller can
 * credit the wallet (idempotently, keyed by txid). Throws on any mismatch or
 * settle error.
 */
export async function settleTopUp(address: string, xdrB64: string): Promise<SettledTopUp> {
  if (!config.contractId) {
    throw new Error("CONTRACT_ID is not configured on the server");
  }
  const tx = decode(xdrB64);

  // Exactly one invocation of topup(from, amount) on the Fallow ledger
  // contract, from the caller, with a positive amount.
  const ops = tx.operations;
  const op = ops[0];
  if (ops.length !== 1 || !op || op.type !== "invokeHostFunction") {
    throw new Error("top-up transaction must be a single contract call");
  }
  const invocation = op.func.invokeContract();
  const contractId = Address.fromScAddress(invocation.contractAddress()).toString();
  const fnName = invocation.functionName().toString();
  const args = invocation.args();
  const from = args[0] ? (scValToNative(args[0]) as string) : "";
  const amount = args[1] ? (scValToNative(args[1]) as bigint) : 0n;
  if (contractId !== config.contractId || fnName !== "topup" || from !== address || amount <= 0n) {
    throw new Error(
      "top-up transaction must call topup(from, amount) on the Fallow ledger contract, from your wallet, with a positive amount",
    );
  }

  const txid = tx.hash().toString("hex");
  const sent = await soroban.sendTransaction(tx);
  if (sent.status !== "PENDING" && sent.status !== "DUPLICATE") {
    throw new Error(sorobanErrorMessage(sent));
  }
  const final = await soroban.pollTransaction(txid);
  if (final.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`top-up transaction did not succeed (${final.status})`);
  }

  return { txid, amountStroops: Number(amount) };
}

/** Best-effort extraction of a readable reason from a failed Soroban RPC send. */
function sorobanErrorMessage(sent: rpc.Api.SendTransactionResponse): string {
  if (sent.errorResult) return `Soroban RPC rejected the transaction: ${sent.errorResult.result().switch().name}`;
  return `Soroban RPC send failed (${sent.status})`;
}
