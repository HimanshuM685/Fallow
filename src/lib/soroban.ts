// Soroban RPC layer for the crowdfunding contract.
// Reads go through transaction *simulation* (no fees, no signature); writes are
// prepared (simulated + auth/footprint assembled), signed by the connected
// wallet, submitted, and then polled to a final status.

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  ADMIN_ADDRESS,
  CONTRACT_ID,
  NATIVE_SAC_ID,
  SOROBAN_RPC_URL,
  STROOPS_PER_XLM,
} from "./config";

const NETWORK = Networks.TESTNET;
const server = new rpc.Server(SOROBAN_RPC_URL);
const contract = new Contract(CONTRACT_ID);
const sac = new Contract(NATIVE_SAC_ID);

/** Signs an XDR string and returns the signed XDR. Provided by the wallet kit. */
export type SignFn = (xdr: string) => Promise<{ signedTxXdr: string }>;

/** Lifecycle a write goes through, surfaced to the UI. */
export type TxPhase = "building" | "signing" | "pending" | "success" | "error";

export interface CampaignState {
  admin: string;
  token: string;
  goalStroops: bigint;
  raisedStroops: bigint;
  deadline: number; // unix seconds
  donors: number;
}

export interface ActivityEvent {
  id: string;
  kind: string; // contrib | reached | withdrawn | refund | init
  from: string | null;
  amount: bigint | null; // stroops
  raised: bigint | null; // stroops
  ledger: number;
  txHash: string;
  at: string; // ISO timestamp
}

// ---------- unit + formatting helpers ----------

export const xlmToStroops = (xlm: number): bigint =>
  BigInt(Math.round(xlm * STROOPS_PER_XLM));

export const stroopsToXlm = (stroops: bigint): number =>
  Number(stroops) / STROOPS_PER_XLM;

export const formatXlm = (stroops: bigint, dp = 2): string =>
  stroopsToXlm(stroops).toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

export const shortAddress = (addr: string): string =>
  addr.length > 12 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fund a testnet account with test XLM via Friendbot. */
export async function fundWithFriendbot(address: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`);
  if (!res.ok) {
    // 400 usually means the account already exists — not a real failure.
    if (res.status === 400) return;
    throw new Error(`Friendbot funding failed (${res.status})`);
  }
}

const addressScVal = (addr: string) => new Address(addr).toScVal();
const i128ScVal = (stroops: bigint) => nativeToScVal(stroops, { type: "i128" });

// ---------- reads (simulation only) ----------

// Any existing account works as the simulation source; sequence is ignored.
async function simulateCall(
  target: Contract,
  method: string,
  args: ReturnType<typeof addressScVal>[] = [],
  source: string = ADMIN_ADDRESS,
): Promise<unknown> {
  const account = new Account(source, "0");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(target.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  if (!sim.result) throw new Error("Simulation returned no result");
  return scValToNative(sim.result.retval);
}

export async function getCampaign(): Promise<CampaignState> {
  const c = (await simulateCall(contract, "get_campaign")) as {
    admin: string;
    token: string;
    goal: bigint;
    raised: bigint;
    deadline: bigint;
    donors: number;
  };
  return {
    admin: c.admin,
    token: c.token,
    goalStroops: BigInt(c.goal),
    raisedStroops: BigInt(c.raised),
    deadline: Number(c.deadline),
    donors: Number(c.donors),
  };
}

export async function getContribution(who: string): Promise<bigint> {
  const v = (await simulateCall(
    contract,
    "get_contribution",
    [addressScVal(who)],
    who,
  )) as bigint;
  return BigInt(v ?? 0);
}

/** Reads the native XLM balance of a classic account via the native SAC. */
export async function getXlmBalance(address: string): Promise<bigint> {
  const v = (await simulateCall(
    sac,
    "balance",
    [addressScVal(address)],
    address,
  )) as bigint;
  return BigInt(v ?? 0);
}

// ---------- writes (prepare → sign → send → poll) ----------

interface WriteArgs {
  address: string;
  sign: SignFn;
  onPhase?: (phase: TxPhase) => void;
}

async function invoke(
  method: string,
  args: ReturnType<typeof addressScVal>[],
  { address, sign, onPhase }: WriteArgs,
): Promise<{ hash: string; returnValue: unknown }> {
  onPhase?.("building");
  const account = await server.getAccount(address);
  const built = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  // Simulate + attach Soroban auth and the ledger footprint.
  const prepared = await server.prepareTransaction(built);

  onPhase?.("signing");
  const { signedTxXdr } = await sign(prepared.toXDR());

  onPhase?.("pending");
  const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK);
  const sent = await server.sendTransaction(signed);
  if (sent.status === "ERROR") {
    throw new Error(`Submission rejected: ${JSON.stringify(sent.errorResult)}`);
  }

  const returnValue = await pollTransaction(sent.hash);
  onPhase?.("success");
  return { hash: sent.hash, returnValue };
}

async function pollTransaction(hash: string): Promise<unknown> {
  for (let i = 0; i < 30; i++) {
    const res = await server.getTransaction(hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return res.returnValue ? scValToNative(res.returnValue) : null;
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("Transaction failed on-chain");
    }
    await sleep(1500); // NOT_FOUND → still settling
  }
  throw new Error("Timed out waiting for confirmation");
}

export function contribute(amountStroops: bigint, w: WriteArgs) {
  return invoke("contribute", [addressScVal(w.address), i128ScVal(amountStroops)], w);
}

export function withdraw(w: WriteArgs) {
  return invoke("withdraw", [], w);
}

export function refund(w: WriteArgs) {
  return invoke("refund", [addressScVal(w.address)], w);
}

// ---------- events (real-time via polling) ----------

interface EventFilterResult {
  events: ActivityEvent[];
  latestLedger: number;
}

/**
 * Fetch contract events since `startLedger` (defaults to a recent window).
 * Soroban RPC has no push/websocket — the UI polls this on an interval.
 */
export async function getEvents(startLedger?: number): Promise<EventFilterResult> {
  const latest = await server.getLatestLedger();
  const filters = [{ type: "contract" as const, contractIds: [CONTRACT_ID] }];

  let start = startLedger && startLedger > 0 ? startLedger : Math.max(1, latest.sequence - 8000);
  let res;
  try {
    res = await server.getEvents({ startLedger: start, filters, limit: 100 });
  } catch {
    // startLedger fell outside the RPC retention window — retry near the tip.
    start = Math.max(1, latest.sequence - 240);
    res = await server.getEvents({ startLedger: start, filters, limit: 100 });
  }

  const events = res.events
    .map(parseEvent)
    .filter((e): e is ActivityEvent => e !== null);
  return { events, latestLedger: latest.sequence };
}

function parseEvent(ev: rpc.Api.EventResponse): ActivityEvent | null {
  try {
    const topics = ev.topic.map((t) => scValToNative(t));
    const kind = String(topics[0]);
    const value = scValToNative(ev.value);

    let from: string | null = null;
    let amount: bigint | null = null;
    let raised: bigint | null = null;

    if (kind === "contrib") {
      from = String(topics[1]);
      amount = BigInt(value[0]);
      raised = BigInt(value[1]);
    } else if (kind === "refund") {
      from = String(topics[1]);
      amount = BigInt(value);
    } else if (kind === "withdrawn") {
      amount = BigInt(value);
    } else if (kind === "reached") {
      raised = BigInt(value);
    } else if (kind === "init") {
      from = topics[1] ? String(topics[1]) : null;
    }

    return {
      id: ev.id,
      kind,
      from,
      amount,
      raised,
      ledger: Number(ev.ledger),
      txHash: ev.txHash,
      at: ev.ledgerClosedAt,
    };
  } catch {
    return null;
  }
}

// ---------- error normalization (three headline categories + fallback) ----------

export type ErrorKind = "wallet-not-found" | "rejected" | "insufficient" | "unknown";

export function describeError(err: unknown): { kind: ErrorKind; message: string } {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
  const msg = (raw || "").toLowerCase();

  if (
    /not installed|not available|no wallet|unavailable|can't find|cannot find|extension/.test(msg)
  ) {
    return {
      kind: "wallet-not-found",
      message: "Wallet not found. Is the extension installed and unlocked?",
    };
  }
  if (/reject|denied|declined|cancel|user closed|closed the modal|not allowed/.test(msg)) {
    return { kind: "rejected", message: "Request rejected in your wallet." };
  }
  if (
    /insufficient|underfunded|not enough|txinsufficientbalance|balance is too low|#10|trustline/.test(
      msg,
    )
  ) {
    return {
      kind: "insufficient",
      message: "Insufficient testnet XLM balance for this contribution.",
    };
  }
  return { kind: "unknown", message: raw || "Something went wrong." };
}
