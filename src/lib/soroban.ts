// Soroban RPC layer for the crowdfunding factory.
// Reads go through transaction *simulation* (no fees, no signature); writes are
// prepared (simulated + auth/footprint assembled), signed by the connected
// wallet, submitted, and polled to a final status.

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
  xdr,
} from "@stellar/stellar-sdk";
import {
  CONTRACT_ID,
  NATIVE_SAC_ID,
  READ_SOURCE_ADDRESS,
  SOROBAN_RPC_URL,
  STROOPS_PER_XLM,
} from "./config";

const NETWORK = Networks.TESTNET;
const server = new rpc.Server(SOROBAN_RPC_URL);
const contract = new Contract(CONTRACT_ID);
const sac = new Contract(NATIVE_SAC_ID);

export type SignFn = (xdr: string) => Promise<{ signedTxXdr: string }>;
export type TxPhase = "building" | "signing" | "pending" | "success" | "error";

export interface Campaign {
  id: number;
  creator: string;
  title: string;
  goalStroops: bigint;
  raisedStroops: bigint;
  deadline: number; // unix seconds
  withdrawn: boolean;
}

export interface ActivityEvent {
  id: string;
  kind: string; // created | contrib | reached | withdrawn | refund
  campaignId: number | null;
  from: string | null;
  amount: bigint | null;
  raised: bigint | null;
  ledger: number;
  txHash: string;
  at: string;
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
  if (!res.ok && res.status !== 400) {
    throw new Error(`Friendbot funding failed (${res.status})`);
  }
}

const addressScVal = (addr: string) => new Address(addr).toScVal();
const u32ScVal = (n: number) => nativeToScVal(n, { type: "u32" });
const u64ScVal = (n: number) => nativeToScVal(BigInt(n), { type: "u64" });
const i128ScVal = (stroops: bigint) => nativeToScVal(stroops, { type: "i128" });
const stringScVal = (s: string) => nativeToScVal(s, { type: "string" });

// ---------- reads (simulation only) ----------

async function simulateCall(
  target: Contract,
  method: string,
  args: xdr.ScVal[] = [],
  source: string = READ_SOURCE_ADDRESS,
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

interface RawCampaign {
  id: number;
  creator: string;
  title: string;
  goal: bigint;
  raised: bigint;
  deadline: bigint;
  withdrawn: boolean;
}

function mapCampaign(c: RawCampaign): Campaign {
  return {
    id: Number(c.id),
    creator: c.creator,
    title: c.title,
    goalStroops: BigInt(c.goal),
    raisedStroops: BigInt(c.raised),
    deadline: Number(c.deadline),
    withdrawn: c.withdrawn,
  };
}

export async function getCampaignCount(): Promise<number> {
  return Number((await simulateCall(contract, "get_campaign_count")) as number);
}

export async function getCampaigns(start = 0, limit = 50): Promise<Campaign[]> {
  const raw = (await simulateCall(contract, "get_campaigns", [
    u32ScVal(start),
    u32ScVal(limit),
  ])) as RawCampaign[];
  return raw.map(mapCampaign);
}

export async function getCampaign(id: number): Promise<Campaign> {
  const c = (await simulateCall(contract, "get_campaign", [u32ScVal(id)])) as RawCampaign;
  return mapCampaign(c);
}

export async function getContribution(id: number, who: string): Promise<bigint> {
  const v = (await simulateCall(
    contract,
    "get_contribution",
    [u32ScVal(id), addressScVal(who)],
    who,
  )) as bigint;
  return BigInt(v ?? 0);
}

/** Reads the native XLM balance of a classic account via the native SAC. */
export async function getXlmBalance(address: string): Promise<bigint> {
  const v = (await simulateCall(sac, "balance", [addressScVal(address)], address)) as bigint;
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
  args: xdr.ScVal[],
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
    await sleep(1500);
  }
  throw new Error("Timed out waiting for confirmation");
}

export async function createCampaign(
  title: string,
  goalStroops: bigint,
  deadline: number,
  w: WriteArgs,
): Promise<{ hash: string; campaignId: number }> {
  const { hash, returnValue } = await invoke(
    "create_campaign",
    [addressScVal(w.address), stringScVal(title), i128ScVal(goalStroops), u64ScVal(deadline)],
    w,
  );
  return { hash, campaignId: Number(returnValue) };
}

export function contribute(id: number, amountStroops: bigint, w: WriteArgs) {
  return invoke("contribute", [u32ScVal(id), addressScVal(w.address), i128ScVal(amountStroops)], w);
}

export function withdraw(id: number, w: WriteArgs) {
  return invoke("withdraw", [u32ScVal(id)], w);
}

export function refund(id: number, w: WriteArgs) {
  return invoke("refund", [u32ScVal(id), addressScVal(w.address)], w);
}

// ---------- events (real-time via polling) ----------

export async function getEvents(): Promise<{ events: ActivityEvent[]; latestLedger: number }> {
  const latest = await server.getLatestLedger();
  const filters = [{ type: "contract" as const, contractIds: [CONTRACT_ID] }];

  let start = Math.max(1, latest.sequence - 8000);
  let res;
  try {
    res = await server.getEvents({ startLedger: start, filters, limit: 200 });
  } catch {
    start = Math.max(1, latest.sequence - 240);
    res = await server.getEvents({ startLedger: start, filters, limit: 200 });
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
    const campaignId = topics[1] !== undefined ? Number(topics[1]) : null;
    const value = scValToNative(ev.value);

    let from: string | null = null;
    let amount: bigint | null = null;
    let raised: bigint | null = null;

    if (kind === "contrib") {
      from = topics[2] ? String(topics[2]) : null;
      amount = BigInt(value[0]);
      raised = BigInt(value[1]);
    } else if (kind === "created") {
      from = topics[2] ? String(topics[2]) : null;
    } else if (kind === "refund") {
      from = topics[2] ? String(topics[2]) : null;
      amount = BigInt(value);
    } else if (kind === "withdrawn") {
      amount = BigInt(value);
    } else if (kind === "reached") {
      raised = BigInt(value);
    }

    return {
      id: ev.id,
      kind,
      campaignId,
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

  if (/not installed|not available|no wallet|unavailable|can't find|cannot find|extension/.test(msg)) {
    return {
      kind: "wallet-not-found",
      message: "Wallet not found. Is the extension installed and unlocked?",
    };
  }
  if (/reject|denied|declined|cancel|user closed|closed the modal|not allowed/.test(msg)) {
    return { kind: "rejected", message: "Request rejected in your wallet." };
  }
  if (/insufficient|underfunded|not enough|txinsufficientbalance|balance is too low|#10|trustline/.test(msg)) {
    return {
      kind: "insufficient",
      message: "Insufficient testnet XLM balance for this transaction.",
    };
  }
  return { kind: "unknown", message: raw || "Something went wrong." };
}
