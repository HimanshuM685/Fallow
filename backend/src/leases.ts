import { nanoid } from "nanoid";
import type { Lease, LeaseStatus, SandboxAccess } from "@fallow/shared";
import { proratedCost } from "@fallow/shared";
import { debitWallet, recordPayout } from "./db.js";
import { payContributor, payoutsEnabled } from "./payout.js";
import { destroyContainer } from "./ws.js";
import { config } from "./config.js";

/**
 * In-memory lease store. Leases track a live sandbox session; like nodes, they
 * don't survive a restart (the sockets they depend on don't either), so they
 * stay in memory and never touch the DB on the hot path. Money only hits
 * Postgres once, at lease end (one debit + one payout).
 */
const leases = new Map<string, Lease>();

export function createLease(
  nodeId: string,
  renterAddr: string,
  payToAddr: string,
  rateStroopsPerHour: number,
  expiresAt: number,
): Lease {
  const now = Date.now();
  const lease: Lease = {
    id: nanoid(12),
    nodeId,
    renterAddr,
    payToAddr,
    access: null,
    status: "starting",
    rateStroopsPerHour,
    startedAt: 0,
    expiresAt,
    createdAt: now,
  };
  leases.set(lease.id, lease);
  return lease;
}

export function getLease(id: string): Lease | undefined {
  return leases.get(id);
}

export function updateLease(
  id: string,
  patch: Partial<Pick<Lease, "access" | "status" | "expiresAt" | "startedAt">>,
): void {
  const lease = leases.get(id);
  if (lease) Object.assign(lease, patch);
}

export function setLeaseStatus(id: string, status: LeaseStatus): void {
  const lease = leases.get(id);
  if (lease) lease.status = status;
}

/** Mark a lease active now that its sandbox is up — starts the billable window. */
export function activateLease(id: string, access: SandboxAccess): void {
  const lease = leases.get(id);
  if (!lease) return;
  lease.access = access;
  lease.status = "active";
  lease.startedAt = Date.now();
}

export function leasesForNode(nodeId: string): Lease[] {
  return [...leases.values()].filter((l) => l.nodeId === nodeId);
}

/**
 * End a lease and bill it exactly once. Idempotent: flips status synchronously
 * before the async work so a concurrent release + watchdog can't double-charge.
 * Usage is prorated at the hourly rate over the actual active duration, debited
 * in a single charge, then the contributor is paid on-chain (minus the platform
 * fee). The sandbox is always torn down.
 */
export async function endLeaseAndBill(leaseId: string, reason: string): Promise<void> {
  const lease = leases.get(leaseId);
  if (!lease) return;
  if (lease.status === "ended" || lease.status === "failed") return;

  const wasActive = lease.status === "active" && lease.startedAt > 0;
  lease.status = "ended"; // claim it synchronously to prevent re-entry

  destroyContainer(lease.nodeId, lease.id); // best-effort teardown

  if (!wasActive) return; // never billed — nothing was used

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - lease.startedAt) / 1000));
  const owed = proratedCost(lease.rateStroopsPerHour, elapsedSeconds);
  try {
    const { charged } = await debitWallet(lease.renterAddr, owed, lease.id, lease.payToAddr, elapsedSeconds);
    console.log(
      `[bill] lease ${lease.id} (${reason}): ${elapsedSeconds}s → charged ${charged} stroops`,
    );
    if (charged > 0) await payoutContributor(lease, charged);
  } catch (err) {
    console.error(`[bill] failed to bill lease ${lease.id}:`, (err as Error).message);
  }
}

/** Pay the contributor their share of a charge on-chain; record it either way. */
async function payoutContributor(lease: Lease, charged: number): Promise<void> {
  const fee = Math.floor((charged * config.platformFeePct) / 100);
  const contributorCut = charged - fee;
  if (contributorCut <= 0) return;

  if (!payoutsEnabled()) {
    console.warn(
      `[payout] PLATFORM_PRIVATE_KEY not set — recording unpaid ${contributorCut} stroops to ${lease.payToAddr}`,
    );
    await recordPayout(lease.payToAddr, lease.id, contributorCut, null);
    return;
  }

  try {
    const txid = await payContributor(lease.id, lease.payToAddr, lease.renterAddr, contributorCut);
    await recordPayout(lease.payToAddr, lease.id, contributorCut, txid);
    console.log(
      `[payout] ${contributorCut} stroops → ${lease.payToAddr} (fee ${fee}, txid ${txid})`,
    );
  } catch (err) {
    await recordPayout(lease.payToAddr, lease.id, contributorCut, null);
    console.error(`[payout] failed to pay ${lease.payToAddr}: ${(err as Error).message}`);
  }
}

/**
 * The watchdog — enforcement half of prepaid billing. It does NOT bill per tick;
 * it only checks whether an active lease has used up the time its balance can
 * afford (`expiresAt`), and if so ends + bills it once. No DB writes per tick.
 */
export function startWatchdog(intervalMs = config.meterIntervalMs): NodeJS.Timeout {
  return setInterval(() => void watchdogTick(), intervalMs);
}

async function watchdogTick(): Promise<void> {
  const now = Date.now();
  for (const lease of leases.values()) {
    if (lease.status !== "active") continue;
    if (now >= lease.expiresAt) {
      console.log(`[watchdog] balance exhausted — ending lease ${lease.id}`);
      await endLeaseAndBill(lease.id, "depleted");
    }
  }
}
