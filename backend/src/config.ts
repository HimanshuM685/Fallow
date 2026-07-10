import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load env from the app's own directory first (highest file priority), then fall
// back to the monorepo-root .env. dotenv never overrides already-set vars, so
// inline env (e.g. `FOO=bar npm run backend`) still wins over both.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv();
loadEnv({ path: resolve(repoRoot, ".env") });

export const config = {
  port: Number(process.env.REGISTRY_PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  heartbeatTimeoutMs: Number(process.env.HEARTBEAT_TIMEOUT_MS ?? 30_000),
  // Neon (Postgres) connection string — stores ONLY wallets, top-ups, charges,
  // payouts. Nodes + leases are kept in memory (they're ephemeral).
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Comma-separated list of allowed web origins for CORS; "*" allows all.
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  // Horizon endpoint used to submit + confirm native-XLM payments (public, no token).
  horizonUrl: process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  // Stellar network passphrase — part of every signature (testnet by default).
  networkPassphrase: process.env.NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
  // USD per 1 XLM — converts a node's USD price into the stroops billing rate.
  xlmUsdPrice: Number(process.env.XLM_USD_PRICE ?? 0.11),
  // Custodial Stellar address (G…) that receives user top-ups. REQUIRED in production.
  platformPayTo: process.env.PLATFORM_PAYTO ?? "",
  // Stellar secret seed (S…) for PLATFORM_PAYTO — signs on-chain contributor
  // payouts. REQUIRED for payouts to work; safeguard it (it custodies funds).
  platformPrivateKey: process.env.PLATFORM_PRIVATE_KEY ?? "",
  // Platform's percentage cut of each charge; the rest is paid to the contributor.
  platformFeePct: Number(process.env.PLATFORM_FEE_PCT ?? 10),
  // How often the watchdog checks active leases for balance exhaustion (ms).
  // It no longer bills per tick — usage is deducted once, at lease end.
  meterIntervalMs: Number(process.env.METER_INTERVAL_MS ?? 10_000),
};
