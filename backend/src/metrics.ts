import type { ActiveComputePoint, LeaderboardEntry, LeaderboardSort, UserGrowthPoint } from "@fallow/shared";
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
 * Top 20 addresses ranked by one of three bases:
 *   topup     — lifetime XLM deposited (stroops)
 *   leasetime — number of leases taken, lifetime (integer count)
 *   leasespan — total lifetime compute time used, across all leases (seconds)
 */
export async function leaderboard(sort: LeaderboardSort): Promise<LeaderboardEntry[]> {
  if (sort === "topup") {
    const { rows } = await pool.query<{ address: string; value: number }>(
      `SELECT address, SUM(amount_stroops)::bigint AS value
       FROM topups GROUP BY address ORDER BY value DESC LIMIT $1`,
      [LEADERBOARD_LIMIT],
    );
    return rows.map((r) => ({ address: r.address, value: Number(r.value) }));
  }
  if (sort === "leasetime") {
    const { rows } = await pool.query<{ address: string; value: number }>(
      `SELECT address, COUNT(*)::bigint AS value
       FROM charges GROUP BY address ORDER BY value DESC LIMIT $1`,
      [LEADERBOARD_LIMIT],
    );
    return rows.map((r) => ({ address: r.address, value: Number(r.value) }));
  }
  // leasespan — total lifetime compute seconds across all leases.
  const { rows } = await pool.query<{ address: string; value: number }>(
    `SELECT address, SUM(seconds)::bigint AS value
     FROM charges GROUP BY address ORDER BY value DESC LIMIT $1`,
    [LEADERBOARD_LIMIT],
  );
  return rows.map((r) => ({ address: r.address, value: Number(r.value) }));
}
