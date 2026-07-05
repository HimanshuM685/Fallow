import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  NetworkError,
  Networks,
  NotFoundError,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

const server = new Horizon.Server(HORIZON_URL);

/**
 * Fetch the native XLM balance for an account.
 * Returns null when the account does not exist yet (unfunded).
 */
export async function fetchXlmBalance(address: string): Promise<string | null> {
  try {
    const account = await server.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  } catch (err) {
    if (err instanceof NotFoundError) {
      return null; // account not funded yet
    }
    throw err;
  }
}

/** Ask Friendbot to fund (create) a testnet account with 10,000 XLM. */
export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(
    `${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.detail ?? `Friendbot request failed (${res.status})`
    );
  }
}

export interface PaymentResult {
  hash: string;
}

/**
 * Build a payment transaction, have Freighter sign it, and submit it
 * to the Stellar testnet via Horizon.
 */
export async function sendXlmPayment(opts: {
  source: string;
  destination: string;
  amount: string;
  memo?: string;
}): Promise<PaymentResult> {
  const sourceAccount = await server.loadAccount(opts.source);

  const builder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).addOperation(
    Operation.payment({
      destination: opts.destination,
      asset: Asset.native(),
      amount: opts.amount,
    })
  );

  if (opts.memo && opts.memo.trim().length > 0) {
    builder.addMemo(Memo.text(opts.memo.trim()));
  }

  const tx = builder.setTimeout(180).build();

  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: opts.source,
  });
  if (signed.error) {
    throw new Error(signed.error.message ?? "Freighter refused to sign");
  }

  const signedTx = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    NETWORK_PASSPHRASE
  );
  const response = await server.submitTransaction(signedTx);
  return { hash: response.hash };
}

/**
 * Stellar text memos are capped at 28 bytes. Build a memo from a string,
 * truncating on a UTF-8 byte boundary so multibyte characters aren't split.
 */
export function toMemoText(input: string, maxBytes = 28): string {
  const bytes = new TextEncoder().encode(input);
  if (bytes.length <= maxBytes) return input;
  const truncated = bytes.slice(0, maxBytes);
  return new TextDecoder("utf-8", { fatal: false })
    .decode(truncated)
    .replace(/�+$/, "");
}

export interface Donation {
  id: string;
  from: string;
  amount: string;
  memo: string | null;
  createdAt: string;
  hash: string;
}

/**
 * Read incoming native-XLM payments to an account from Horizon and resolve
 * each one's memo (which carries the supporter's name/message). Returns [] for
 * an account that doesn't exist on testnet yet.
 */
export async function fetchDonations(
  address: string,
  limit = 30
): Promise<Donation[]> {
  try {
    const page = await server
      .payments()
      .forAccount(address)
      .order("desc")
      .limit(limit)
      .call();

    const out: Donation[] = [];
    for (const rec of page.records) {
      if (rec.type !== "payment") continue;
      const p = rec as Horizon.ServerApi.PaymentOperationRecord;
      if (p.to !== address || p.asset_type !== "native") continue;

      let memo: string | null = null;
      try {
        const txRecord = await p.transaction();
        memo = txRecord.memo ?? null;
      } catch {
        memo = null;
      }
      out.push({
        id: p.id,
        from: p.from,
        amount: p.amount,
        memo,
        createdAt: p.created_at,
        hash: p.transaction_hash,
      });
    }
    return out;
  } catch (err) {
    if (err instanceof NotFoundError) return [];
    throw err;
  }
}

/** Turn a Horizon submit error into a human-readable message. */
export function describeHorizonError(err: unknown): string {
  if (err instanceof NetworkError) {
    const data = err.response?.data as
      | { extras?: { result_codes?: { transaction?: string; operations?: string[] } } }
      | undefined;
    const codes = data?.extras?.result_codes;
    if (codes) {
      const parts = [codes.transaction, ...(codes.operations ?? [])].filter(
        Boolean
      );
      const known: Record<string, string> = {
        op_underfunded: "Insufficient balance to cover this payment.",
        op_no_destination:
          "Destination account does not exist on testnet (fund it with Friendbot first).",
        tx_bad_seq: "Bad sequence number — please try again.",
        tx_insufficient_fee: "Fee too low — please try again.",
      };
      for (const p of parts) {
        if (p && known[p]) return known[p];
      }
      return `Transaction failed: ${parts.join(", ")}`;
    }
  }
  return err instanceof Error ? err.message : "Unknown error";
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}
