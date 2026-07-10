import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { router } from "./routes.js";
import { initDb } from "./db.js";
import { initWs } from "./ws.js";
import { startWatchdog } from "./leases.js";

// A billing/payment error must never take down the registry.
process.on("unhandledRejection", (reason) => {
  console.error("[registry] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[registry] uncaughtException:", err);
});

const corsOrigin = config.corsOrigin === "*" ? "*" : config.corsOrigin.split(",").map((s) => s.trim());

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(router);

async function main(): Promise<void> {
  await initDb();

  const httpServer = createServer(app);
  initWs(httpServer, corsOrigin);
  startWatchdog();

  httpServer.listen(config.port, () => {
    console.log(`[registry] listening on http://localhost:${config.port}`);
    console.log(`[registry] Neon Postgres connected (wallets only); watchdog every ${config.meterIntervalMs}ms`);
    console.log(`[registry] top-ups → ${config.platformPayTo || "(PLATFORM_PAYTO not set!)"} @ $${config.xlmUsdPrice}/XLM`);
    console.log(`[registry] payouts ${config.platformPrivateKey ? "enabled" : "DISABLED (set PLATFORM_PRIVATE_KEY)"}, platform fee ${config.platformFeePct}%`);
  });
}

main().catch((err) => {
  console.error("[registry] failed to start:", err);
  process.exit(1);
});
