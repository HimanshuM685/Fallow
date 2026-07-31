import pg from "pg";
import type { Charge, Payout, TopUp, Wallet, WalletStats, WalletSummary } from "@fallow/shared";
import { config } from "./config.js";

// Neon is plain Postgres over TLS. A pool suits the long-running registry.
// Only money state lives here: wallets + their history. Nodes and leases are
// ephemeral and kept in memory (see registry.ts / leases.ts).
const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

// int8/bigint comes back as a string by default; we store epoch-ms + stroops
// (well within Number's safe range here) so parse them to numbers.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

type Row = Record<string, unknown>;
async function q<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Create tables if they don't exist. Call once at startup before serving. */
export async function initDb(): Promise<void> {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not set — point it at your Neon Postgres connection string");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      address         TEXT PRIMARY KEY,
      balance_stroops BIGINT NOT NULL DEFAULT 0,
      updated_at      BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topups (
      txid           TEXT PRIMARY KEY,
      address        TEXT NOT NULL,
      amount_stroops BIGINT NOT NULL,
      created_at     BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS charges (
      id             BIGSERIAL PRIMARY KEY,
      address        TEXT NOT NULL,
      lease_id       TEXT NOT NULL,
      pay_to         TEXT NOT NULL DEFAULT '',
      amount_stroops BIGINT NOT NULL,
      seconds        INTEGER NOT NULL,
      created_at     BIGINT NOT NULL
    );
    -- Add pay_to to charges created by older builds (idempotent).
    ALTER TABLE charges ADD COLUMN IF NOT EXISTS pay_to TEXT NOT NULL DEFAULT '';

    CREATE TABLE IF NOT EXISTS payouts (
      id             BIGSERIAL PRIMARY KEY,
      to_addr        TEXT NOT NULL,
      lease_id       TEXT NOT NULL,
      amount_stroops BIGINT NOT NULL,
      txid           TEXT,
      created_at     BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS topups_address_idx ON topups (address, created_at DESC);
    CREATE INDEX IF NOT EXISTS charges_address_idx ON charges (address, created_at DESC);
    CREATE INDEX IF NOT EXISTS payouts_addr_idx ON payouts (to_addr, created_at DESC);
  `);
}

// ─────────────────────────────── wallets ───────────────────────────────

interface WalletRow {
  address: string;
  balance_stroops: number;
  updated_at: number;
}

export async function getWallet(address: string): Promise<Wallet> {
  const rows = await q<WalletRow>("SELECT * FROM wallets WHERE address = $1", [address]);
  const r = rows[0];
  return {
    address,
    balanceStroops: r?.balance_stroops ?? 0,
    updatedAt: r?.updated_at ?? 0,
  };
}

export async function getBalance(address: string): Promise<number> {
  return (await getWallet(address)).balanceStroops;
}

/**
 * Credit a wallet from a confirmed on-chain deposit. Idempotent on `txid`: the
 * topups PK means re-submitting the same deposit never double-credits.
 * Returns the new balance.
 */
export async function creditWallet(
  address: string,
  amountStroops: number,
  txid: string,
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO topups (txid, address, amount_stroops, created_at)
       VALUES ($1,$2,$3,$4) ON CONFLICT (txid) DO NOTHING RETURNING txid`,
      [txid, address, amountStroops, Date.now()],
    );
    if (ins.rowCount === 0) {
      // Already credited — return current balance unchanged.
      const cur = await client.query("SELECT balance_stroops FROM wallets WHERE address = $1", [address]);
      await client.query("COMMIT");
      return cur.rows[0]?.balance_stroops ?? 0;
    }
    const upd = await client.query(
      `INSERT INTO wallets (address, balance_stroops, updated_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (address) DO UPDATE SET
         balance_stroops = wallets.balance_stroops + $2, updated_at = $3
       RETURNING balance_stroops`,
      [address, amountStroops, Date.now()],
    );
    await client.query("COMMIT");
    return Number(upd.rows[0].balance_stroops);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Debit a wallet for metered usage, never below zero. Records ONE charge row.
 * Called once, at lease end (not per tick). Returns the amount actually charged
 * and the remaining balance.
 */
export async function debitWallet(
  address: string,
  requestedStroops: number,
  leaseId: string,
  payToAddr: string,
  seconds: number,
): Promise<{ charged: number; balance: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cur = await client.query(
      "SELECT balance_stroops FROM wallets WHERE address = $1 FOR UPDATE",
      [address],
    );
    const balance = Number(cur.rows[0]?.balance_stroops ?? 0);
    const charged = Math.max(0, Math.min(requestedStroops, balance));
    const remaining = balance - charged;
    if (charged > 0) {
      await client.query(
        "UPDATE wallets SET balance_stroops = $1, updated_at = $2 WHERE address = $3",
        [remaining, Date.now(), address],
      );
      await client.query(
        `INSERT INTO charges (address, lease_id, pay_to, amount_stroops, seconds, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [address, leaseId, payToAddr, charged, seconds, Date.now()],
      );
    }
    await client.query("COMMIT");
    return { charged, balance: remaining };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Record a contributor payout (txid null if the on-chain send failed/skipped). */
export async function recordPayout(
  toAddr: string,
  leaseId: string,
  amountStroops: number,
  txid: string | null,
): Promise<void> {
  await q(
    `INSERT INTO payouts (to_addr, lease_id, amount_stroops, txid, created_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [toAddr, leaseId, amountStroops, txid, Date.now()],
  );
}

export async function walletSummary(address: string): Promise<WalletSummary> {
  const [wallet, topupRows, chargeRows, payoutRows, chargeAgg, topupAgg, payoutAgg] = await Promise.all([
    getWallet(address),
    q<{ txid: string; address: string; amount_stroops: number; created_at: number }>(
      "SELECT * FROM topups WHERE address = $1 ORDER BY created_at DESC LIMIT 50",
      [address],
    ),
    q<{
      id: number;
      address: string;
      lease_id: string;
      pay_to: string;
      amount_stroops: number;
      seconds: number;
      created_at: number;
      payout_txid: string | null;
    }>(
      `SELECT c.*, p.txid AS payout_txid
         FROM charges c
         LEFT JOIN payouts p ON p.lease_id = c.lease_id
        WHERE c.address = $1
        ORDER BY c.created_at DESC LIMIT 50`,
      [address],
    ),
    q<{ id: number; to_addr: string; lease_id: string; amount_stroops: number; txid: string | null; created_at: number }>(
      "SELECT * FROM payouts WHERE to_addr = $1 ORDER BY created_at DESC LIMIT 50",
      [address],
    ),
    // Lifetime aggregates (not capped by the history LIMITs above). SUM(bigint)
    // is numeric, so cast back to bigint for the int8→Number parser.
    q<{ spent: number; secs: number; cnt: number }>(
      `SELECT COALESCE(SUM(amount_stroops),0)::bigint AS spent,
              COALESCE(SUM(seconds),0)::bigint AS secs,
              COUNT(*)::bigint AS cnt
         FROM charges WHERE address = $1`,
      [address],
    ),
    q<{ topped: number }>(
      "SELECT COALESCE(SUM(amount_stroops),0)::bigint AS topped FROM topups WHERE address = $1",
      [address],
    ),
    q<{ earned: number; pcnt: number }>(
      `SELECT COALESCE(SUM(amount_stroops),0)::bigint AS earned, COUNT(*)::bigint AS pcnt
         FROM payouts WHERE to_addr = $1`,
      [address],
    ),
  ]);
  const topups: TopUp[] = topupRows.map((t) => ({
    txid: t.txid,
    address: t.address,
    amountStroops: t.amount_stroops,
    createdAt: t.created_at,
  }));
  const charges: Charge[] = chargeRows.map((c) => ({
    id: c.id,
    address: c.address,
    leaseId: c.lease_id,
    payToAddr: c.pay_to,
    amountStroops: c.amount_stroops,
    seconds: c.seconds,
    createdAt: c.created_at,
    payoutTxid: c.payout_txid,
  }));
  const payouts: Payout[] = payoutRows.map((p) => ({
    id: p.id,
    toAddr: p.to_addr,
    leaseId: p.lease_id,
    amountStroops: p.amount_stroops,
    txid: p.txid,
    createdAt: p.created_at,
  }));
  const stats: WalletStats = {
    totalSpentStroops: chargeAgg[0]?.spent ?? 0,
    totalToppedUpStroops: topupAgg[0]?.topped ?? 0,
    totalLeaseSeconds: chargeAgg[0]?.secs ?? 0,
    leaseCount: chargeAgg[0]?.cnt ?? 0,
    totalEarnedStroops: payoutAgg[0]?.earned ?? 0,
    payoutCount: payoutAgg[0]?.pcnt ?? 0,
  };
  return { address, balanceStroops: wallet.balanceStroops, topups, charges, payouts, stats };
}

export default pool;
