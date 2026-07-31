import type {
  ActiveComputePoint,
  ContributorSort,
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardSort,
  RankedEntry,
  UserGrowthPoint,
} from "@fallow/shared";
import pool from "./db.js";

/**
 * Cumulative distinct users over time: each user's first-ever top-up date
 * counts as their "join" day, then it's a running total. Bucketed daily.
 */
export async function userGrowth(): Promise<UserGrowthPoint[]> {
  const { rows } = await pool.query<{ date: string; new_users: number }>(
    `WITH first_topup AS (
       SELECT address, MIN(created_at) AS first_at FROM topups GROUP BY address
     ), daily AS (
       SELECT to_char(to_timestamp(first_at / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
              COUNT(*) AS new_users
       FROM first_topup GROUP BY 1
     )
     SELECT date, new_users FROM daily ORDER BY date ASC`,
  );
  let total = 0;
  return rows.map((r) => {
    total += Number(r.new_users);
    return { date: r.date, totalUsers: total };
  });
}

/**
 * Daily active users on compute: distinct addresses that had a lease billed
 * (i.e. actually used a sandbox) that day. Bucketed by the charge's created_at
 * (lease-end time) — a lightweight proxy for "used compute that day" rather
 * than a full session-overlap reconstruction.
 */
export async function activeCompute(): Promise<ActiveComputePoint[]> {
  const { rows } = await pool.query<{ date: string; active_users: number }>(
    `SELECT to_char(to_timestamp(created_at / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
            COUNT(DISTINCT address) AS active_users
     FROM charges GROUP BY 1 ORDER BY 1 ASC`,
  );
  return rows.map((r) => ({ date: r.date, activeUsers: Number(r.active_users) }));
}

const LEADERBOARD_LIMIT = 20;

/**
 * The aggregate behind each ranking basis, as `(address, value)` — one place so
 * the top-20 list and a single address's rank can never drift apart.
 *
 * User bases:
 *   topup     — lifetime XLM deposited (stroops)
 *   leasetime — number of leases taken, lifetime (integer count)
 *   leasespan — total lifetime compute time used, across all leases (seconds)
 *
 * Contributor bases (by pay_to address):
 *   leasetime  — total lifetime compute time served (seconds)
 *   servecount — total leases served, lifetime (repeat renters count each time)
 */
const USER_BASIS: Record<LeaderboardSort, string> = {
  topup: `SELECT address, SUM(amount_stroops)::bigint AS value FROM topups GROUP BY address`,
  leasetime: `SELECT address, COUNT(*)::bigint AS value FROM charges GROUP BY address`,
  leasespan: `SELECT address, SUM(seconds)::bigint AS value FROM charges GROUP BY address`,
};

const CONTRIBUTOR_BASIS: Record<ContributorSort, string> = {
  leasetime: `SELECT pay_to AS address, SUM(seconds)::bigint AS value
              FROM charges WHERE pay_to <> '' GROUP BY pay_to`,
  servecount: `SELECT pay_to AS address, COUNT(*)::bigint AS value
               FROM charges WHERE pay_to <> '' GROUP BY pay_to`,
};

async function topN(basis: string): Promise<LeaderboardEntry[]> {
  const { rows } = await pool.query<{ address: string; value: string }>(
    `${basis} ORDER BY value DESC LIMIT $1`,
    [LEADERBOARD_LIMIT],
  );
  return rows.map((r) => ({ address: r.address, value: Number(r.value) }));
}

/**
 * One address's absolute rank on a basis, or null if it has no rows there (never
 * topped up / never served). Ranks over the whole table, not just the top 20 —
 * that's the point, it's for addresses that fell off the list.
 */
async function rankOf(basis: string, address: string): Promise<RankedEntry | null> {
  const { rows } = await pool.query<{ address: string; value: string; rank: string }>(
    `WITH ranked AS (
       SELECT address, value, RANK() OVER (ORDER BY value DESC) AS rank FROM (${basis}) b
     )
     SELECT address, value, rank FROM ranked WHERE address = $1`,
    [address],
  );
  const r = rows[0];
  return r ? { address: r.address, value: Number(r.value), rank: Number(r.rank) } : null;
}

/** Top 20 for `sort`, plus `address`'s own ranked row when it missed the cut. */
export async function leaderboard(
  sort: LeaderboardSort,
  address?: string,
): Promise<LeaderboardResponse> {
  return withYou(USER_BASIS[sort], address);
}

/** Top 20 contributors for `sort`, plus `address`'s row when it missed the cut. */
export async function contributorLeaderboard(
  sort: ContributorSort,
  address?: string,
): Promise<LeaderboardResponse> {
  return withYou(CONTRIBUTOR_BASIS[sort], address);
}

async function withYou(basis: string, address?: string): Promise<LeaderboardResponse> {
  const entries = await topN(basis);
  if (!address || entries.some((e) => e.address === address)) return { entries };
  const you = await rankOf(basis, address);
  return you ? { entries, you } : { entries };
}
