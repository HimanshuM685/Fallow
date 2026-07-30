/**
 * @fallow/shared — types, contracts, and helpers shared across the registry,
 * the contributor agent, and the autonomous consumer agent.
 */

// ───────────────────────────── Domain models ─────────────────────────────

export type NodeStatus = "online" | "offline";

/** A compute node advertised by a contributor. */
export interface ComputeNode {
  id: string;
  /** Stellar address (G…) of the node owner (used for auth + display). */
  ownerAddr: string;
  /** Stellar address (G…) that receives XLM payouts for this node. */
  payToAddr: string;
  label: string;
  cpuCores: number;
  ramMb: number;
  /** GPU model string, or null if none. */
  gpu: string | null;
  /** Advertised price per hour, in USD (industry-standard hourly billing). */
  pricePerHourUsd: number;
  status: NodeStatus;
  /** Unix ms of the last heartbeat. */
  lastHeartbeat: number;
  createdAt: number;
}

/** Public view of a node returned by GET /explorer (no internal fields). */
export type ExplorerNode = Pick<
  ComputeNode,
  | "id"
  | "ownerAddr"
  | "payToAddr"
  | "label"
  | "cpuCores"
  | "ramMb"
  | "gpu"
  | "pricePerHourUsd"
  | "status"
>;

export type LeaseStatus = "starting" | "active" | "ended" | "failed";

/** How a renter reaches a running sandbox. Currently SSH only. */
export interface SandboxAccess {
  kind: "ssh";
  /** Host to SSH to (e.g. a bore endpoint, or 127.0.0.1 in local mode). */
  host: string;
  port: number;
  username: string;
  /** SSH password — set to the renter's own Stellar address. */
  password: string;
  /** Ready-to-copy connect command, e.g. "ssh root@bore.pub -p 12345". */
  command: string;
}

/** A metered session on a node, billed from the renter's prepaid wallet. */
export interface Lease {
  id: string;
  nodeId: string;
  /** Stellar address (G…) of the renter (whose wallet balance is billed). */
  renterAddr: string;
  /** Stellar address (G…) the contributor is paid out to on lease end. */
  payToAddr: string;
  /** SSH access details, once the container is ready. */
  access: SandboxAccess | null;
  status: LeaseStatus;
  /** Billing rate snapshotted at lease start, in stroops per hour. */
  rateStroopsPerHour: number;
  /** Unix ms the sandbox went active (start of the billable window). */
  startedAt: number;
  /**
   * Projected Unix ms when the wallet runs dry at the current rate, computed
   * once at lease start from the affordable time. The lease ends when the
   * balance is used up; usage is billed once, at the end. Used by the UI to
   * show "time left".
   */
  expiresAt: number;
  createdAt: number;
}

// ───────────────────────────── Prepaid wallet ─────────────────────────────
// Users top up a custodial XLM balance once, then renting a node meters time
// and debits that balance. Top-ups (deposits) and charges (metered usage) are
// both recorded so the user has a full history.

/** A user's prepaid balance, keyed by their Stellar address. */
export interface Wallet {
  address: string;
  balanceStroops: number;
  updatedAt: number;
}

/** A confirmed on-chain deposit that credited a wallet. */
export interface TopUp {
  txid: string;
  address: string;
  amountStroops: number;
  createdAt: number;
}

/** A metered deduction from a wallet for compute usage (billed once, at end). */
export interface Charge {
  id: number;
  /** Renter address that was charged (the payer). */
  address: string;
  leaseId: string;
  /** Contributor / compute-owner address this usage was paid for. */
  payToAddr: string;
  amountStroops: number;
  /** Seconds of usage this charge covers (the billed duration). */
  seconds: number;
  createdAt: number;
}

/** An on-chain payout to a contributor for compute they provided. */
export interface Payout {
  id: number;
  /** Contributor address that received the payout. */
  toAddr: string;
  leaseId: string;
  amountStroops: number;
  /** On-chain transaction id of the payout, or null if it failed/skipped. */
  txid: string | null;
  createdAt: number;
}

/** Lifetime aggregates for an address (computed server-side, not capped). */
export interface WalletStats {
  /** Total XLM ever spent on compute (stroops). */
  totalSpentStroops: number;
  /** Total XLM ever deposited (stroops). */
  totalToppedUpStroops: number;
  /** Total billed compute time across all leases, in seconds. */
  totalLeaseSeconds: number;
  /** Number of leases that were billed. */
  leaseCount: number;
  /** Total XLM earned as a contributor (payouts received, stroops). */
  totalEarnedStroops: number;
  /** Number of payouts received as a contributor. */
  payoutCount: number;
}

/** Wallet + its deposit/spend history, contributor earnings, and lifetime stats. */
export interface WalletSummary {
  address: string;
  balanceStroops: number;
  topups: TopUp[];
  charges: Charge[];
  /** Payouts received as a contributor (earnings history). */
  payouts: Payout[];
  stats: WalletStats;
}

/** One day's point on the cumulative-user-growth chart (GET /metrics/growth). */
export interface UserGrowthPoint {
  /** Day, as an ISO date string (UTC midnight), e.g. "2026-07-30". */
  date: string;
  /** Cumulative distinct users who had topped up by the end of this day. */
  totalUsers: number;
}

/** One day's point on the active-users-on-compute chart (GET /metrics/active). */
export interface ActiveComputePoint {
  date: string;
  /** Distinct users who had a lease billed (i.e. used compute) that day. */
  activeUsers: number;
}

/** Leaderboard ranking basis (GET /leaderboard?sort=...). */
export type LeaderboardSort = "topup" | "leasetime" | "leasespan";

/** One ranked row on the leaderboard. `value`'s unit depends on `sort`: stroops
 *  for "topup", seconds for "leasetime", days for "leasespan". */
export interface LeaderboardEntry {
  address: string;
  value: number;
}

export interface Job {
  id: string;
  leaseId: string;
  /** Code/script to execute inside the sandbox. */
  payload: string;
  result: string | null;
  status: "pending" | "running" | "done" | "error";
}

// ───────────────────────── WebSocket contract ─────────────────────────
// The contributor agent connects to the registry over socket.io. These are
// the message names + payloads exchanged on that channel.

/** Resource caps the registry asks the agent to enforce on a container. */
export interface SandboxLimits {
  memory: string; // e.g. "2g"
  cpus: number;
  gpus: string; // "all" or "" (none)
}

/**
 * agent -> registry: authenticate the socket, registering (or re-attaching to)
 * a node. Carries the node's advertised specs so registration + auth happen in
 * one signed message.
 */
export interface AgentHelloMsg {
  /** Existing node id to re-attach to, or omit/empty to create a new one. */
  nodeId?: string;
  ownerAddr: string;
  /** Base64 ed25519 signature over `nonce` (Keypair.sign), proving ownership of ownerAddr. */
  signature: string;
  nonce: string;
  /** Advertised node specs. */
  spec: RegisterNodeRequest;
}

/** registry -> agent: hello accepted; the canonical node id to use henceforth. */
export interface HelloAckMsg {
  nodeId: string;
}

/** agent -> registry: periodic liveness ping. */
export interface HeartbeatMsg {
  nodeId: string;
}

/** registry -> agent: spin up a sandbox for a paid lease. */
export interface StartContainerMsg {
  leaseId: string;
  image: string;
  limits: SandboxLimits;
  /** SSH password to set inside the sandbox (the renter's address). */
  sshPassword: string;
}

/** agent -> registry: the sandbox is up and reachable for SSH at host:port. */
export interface ContainerReadyMsg {
  leaseId: string;
  /** SSH host (bore endpoint, or 127.0.0.1 in local mode). */
  host: string;
  /** SSH port. */
  port: number;
}

/** agent -> registry: the sandbox failed to start. */
export interface ContainerFailedMsg {
  leaseId: string;
  error: string;
}

/** registry -> agent: tear down the sandbox for a lease. */
export interface DestroyContainerMsg {
  leaseId: string;
}

/** registry -> agent: run a job inside an existing lease's sandbox. */
export interface RunJobMsg {
  leaseId: string;
  jobId: string;
  payload: string;
}

/** agent -> registry: job finished (or errored). */
export interface JobResultMsg {
  jobId: string;
  ok: boolean;
  result: string;
}

/** Socket.io event names, centralized to avoid typos across processes. */
export const WS = {
  hello: "hello",
  helloAck: "hello-ack",
  heartbeat: "heartbeat",
  startContainer: "start-container",
  containerReady: "container-ready",
  containerFailed: "container-failed",
  destroyContainer: "destroy-container",
  runJob: "run-job",
  jobResult: "job-result",
} as const;

// ───────────────────────────── HTTP DTOs ─────────────────────────────

export interface RegisterNodeRequest {
  ownerAddr: string;
  payToAddr: string;
  label: string;
  cpuCores: number;
  ramMb: number;
  gpu: string | null;
  pricePerHourUsd: number;
}

/** POST /rent/:nodeId response: SSH access + the hourly rate + lease token. */
export interface RentResponse {
  leaseId: string;
  access: SandboxAccess;
  expiresAt: number;
  rateStroopsPerHour: number;
  leaseToken: string;
}

export interface RunRequest {
  payload: string;
}

export interface RunResponse {
  jobId: string;
  ok: boolean;
  result: string;
}

// ───────────────────────── Wallet auth + top-up DTOs ─────────────────────────
// Native XLM, no x402. The user proves control of their address by signing a
// login challenge, then tops up a custodial balance by signing a payment txn to
// the platform address. Both use the wallet's existing transaction signing.

/** GET /auth/wallet-nonce → a short-lived challenge to sign for wallet login. */
export interface WalletNonceResponse {
  nonce: string;
}

/** POST /auth/wallet-login → prove address control with a signed self-payment. */
export interface WalletLoginRequest {
  address: string;
  /** Base64 XDR of a signed 1-stroop self-payment whose memo = hash(nonce). */
  payment: string;
  nonce: string;
}

/** POST /auth/wallet-login response: a session token + the current balance. */
export interface WalletLoginResponse {
  token: string;
  address: string;
  balanceStroops: number;
}

/** The platform address top-ups are sent to (GET /platform). */
export interface PlatformInfo {
  /** Stellar address (G…) that receives custodial top-ups. */
  payTo: string;
  /** Stellar network passphrase (see STELLAR_TESTNET_PASSPHRASE). */
  network: string;
  /** USD per 1 XLM, for showing prices in XLM. */
  xlmUsdPrice: number;
  /** Contract id (C…) of the Fallow ledger contract — every top-up/payout goes through it. */
  contractId: string;
}

/** POST /wallet/topup → credit the caller's balance with a confirmed deposit. */
export interface TopUpRequest {
  /** Base64 XDR of a signed `topup(from, amount)` invocation on the Fallow ledger contract. */
  payment: string;
}

/** Convert a USD amount to stroops at `xlmUsdPrice` (USD per 1 XLM). */
export function usdToStroops(usdAmount: number, xlmUsdPrice: number): number {
  return Math.round((usdAmount / xlmUsdPrice) * 1e7);
}

/** A node's per-hour rate in stroops (its USD price converted at `xlmUsdPrice`). */
export function stroopsPerHour(pricePerHourUsd: number, xlmUsdPrice: number): number {
  return usdToStroops(pricePerHourUsd, xlmUsdPrice);
}

/** Prorated cost in stroops for `seconds` of usage at a per-hour rate. */
export function proratedCost(rateStroopsPerHour: number, seconds: number): number {
  return Math.round((seconds / 3600) * rateStroopsPerHour);
}

/** Format stroops for display, e.g. 1000000 -> "0.1000 XLM". */
export function formatXlm(stroops: number): string {
  return `${(stroops / 1e7).toFixed(4)} XLM`;
}

/** A node is online if it has beat within the timeout window. */
export function isOnline(lastHeartbeat: number, timeoutMs: number, now = Date.now()): boolean {
  return now - lastHeartbeat <= timeoutMs;
}

/** Stellar testnet network passphrase (part of every signature). */
export const STELLAR_TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
