import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import {
  STELLAR_TESTNET_PASSPHRASE,
  stroopsPerHour,
  type PlatformInfo,
  type RentResponse,
  type RunRequest,
  type RunResponse,
  type SandboxLimits,
  type WalletLoginResponse,
} from "@tendril/shared";
import {
  addressFromSession,
  issueLeaseToken,
  issueNonce,
  issueSession,
  issueWalletNonce,
  leaseIdFromAuthHeader,
  verifyWalletNonce,
} from "./auth.js";
import { creditWallet, getBalance, walletSummary } from "./db.js";
import { getNode, listNodesByOwner, listOnlineNodes } from "./registry.js";
import { createLease, endLeaseAndBill, getLease, setLeaseStatus } from "./leases.js";
import { settleTopUp, verifyLoginSignature } from "./wallet.js";
import { isNodeConnected, runJob, startContainer } from "./ws.js";
import { config } from "./config.js";

export const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

// Where to send top-ups + the rate used to show prices in XLM.
router.get("/platform", (_req, res) => {
  const info: PlatformInfo = {
    payTo: config.platformPayTo,
    network: STELLAR_TESTNET_PASSPHRASE,
    xlmUsdPrice: config.xlmUsdPrice,
  };
  res.json(info);
});

// ─────────────────────── contributor agent auth (WS hello) ───────────────────────
router.get("/auth/nonce", (req: Request, res: Response) => {
  const address = String(req.query.address ?? "");
  if (!address) return res.status(400).json({ error: "address required" });
  res.json({ nonce: issueNonce(address) });
});

// ─────────────────────── wallet login (web users) ───────────────────────
router.get("/auth/wallet-nonce", (req: Request, res: Response) => {
  const address = String(req.query.address ?? "");
  if (!address) return res.status(400).json({ error: "address required" });
  res.json({ nonce: issueWalletNonce(address) });
});

router.post("/auth/wallet-login", async (req: Request, res: Response) => {
  const { address, payment, nonce } = (req.body ?? {}) as {
    address?: string;
    payment?: string;
    nonce?: string;
  };
  if (!address || !payment || !nonce) {
    return res.status(400).json({ error: "address, payment and nonce required" });
  }
  if (!verifyWalletNonce(nonce, address)) {
    return res.status(401).json({ error: "stale or invalid login challenge" });
  }
  if (!verifyLoginSignature(address, payment, nonce)) {
    return res.status(401).json({ error: "signature did not verify for this address" });
  }
  const body: WalletLoginResponse = {
    token: issueSession(address),
    address,
    balanceStroops: await getBalance(address),
  };
  res.json(body);
});

// ─────────────────────── discovery (free) ───────────────────────
router.get("/explorer", (_req, res) => {
  res.json({ nodes: listOnlineNodes() });
});

router.get("/nodes", (req: Request, res: Response) => {
  const owner = String(req.query.owner ?? "");
  if (!owner) return res.status(400).json({ error: "owner required" });
  res.json({ nodes: listNodesByOwner(owner) });
});

// ─────────────────────── prepaid wallet (session-gated) ───────────────────────
router.get("/wallet", async (req: Request, res: Response) => {
  const address = requireSession(req, res);
  if (!address) return;
  res.json(await walletSummary(address));
});

router.post("/wallet/topup", async (req: Request, res: Response) => {
  const address = requireSession(req, res);
  if (!address) return;
  const payment = (req.body as { payment?: string })?.payment;
  if (!payment) return res.status(400).json({ error: "payment (signed txn) required" });
  try {
    const { txid, amountStroops } = await settleTopUp(address, payment);
    const balanceStroops = await creditWallet(address, amountStroops, txid);
    res.json({ txid, balanceStroops });
  } catch (err) {
    res.status(502).json({ error: `top-up failed: ${(err as Error).message}` });
  }
});

// ─────────────────────── rent (spends the prepaid balance) ───────────────────────
router.post("/rent/:nodeId", async (req: Request, res: Response) => {
  const address = requireSession(req, res);
  if (!address) return;

  const node = getNode(req.params.nodeId);
  if (!node) return res.status(404).json({ error: "node not found" });
  if (node.status !== "online" || !isNodeConnected(node.id)) {
    return res.status(503).json({ error: "node is offline" });
  }

  const rate = stroopsPerHour(node.pricePerHourUsd, config.xlmUsdPrice);
  const balance = await getBalance(address);
  if (balance <= 0) {
    return res.status(402).json({
      error: "insufficient balance — top up your wallet",
      balanceStroops: balance,
      rateStroopsPerHour: rate,
    });
  }

  // No upfront debit: usage is billed once, at lease end. expiresAt is just the
  // projected "wallet runs dry" time the watchdog enforces.
  const expiresAt = Date.now() + (rate > 0 ? (balance / rate) * 3_600_000 : 0);
  const lease = createLease(node.id, address, node.payToAddr, rate, expiresAt);

  const limits: SandboxLimits = {
    memory: process.env.DEFAULT_SANDBOX_MEMORY ?? "2g",
    cpus: Math.min(node.cpuCores, 4),
    gpus: node.gpu ? "all" : "",
  };

  try {
    // The renter's own address doubles as the sandbox SSH password.
    const access = await startContainer(
      node.id,
      lease.id,
      process.env.DEFAULT_SANDBOX_IMAGE ?? "",
      limits,
      address,
    );
    const body: RentResponse = {
      leaseId: lease.id,
      access,
      expiresAt,
      rateStroopsPerHour: rate,
      leaseToken: issueLeaseToken(lease.id),
    };
    res.json(body);
  } catch (err) {
    setLeaseStatus(lease.id, "failed");
    res.status(502).json({ error: `sandbox failed to start: ${(err as Error).message}` });
  }
});

// ─────────────────────── lease-token-gated: run / release / status ───────────────────────
router.post("/lease/:id/run", async (req: Request, res: Response) => {
  const lease = requireLease(req, res);
  if (!lease) return;
  if (lease.status !== "active") {
    return res.status(409).json({ error: "lease not active" });
  }
  const payload = (req.body as RunRequest)?.payload;
  if (typeof payload !== "string") {
    return res.status(400).json({ error: "payload (string) required" });
  }
  const jobId = nanoid(10);
  try {
    const result = await runJob(lease.nodeId, lease.id, jobId, payload);
    const body: RunResponse = { jobId, ok: result.ok, result: result.result };
    res.json(body);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

router.post("/lease/:id/release", async (req: Request, res: Response) => {
  const lease = requireLease(req, res);
  if (!lease) return;
  // Bill the actual usage once, pay the contributor, and tear down the sandbox.
  await endLeaseAndBill(lease.id, "released");
  res.json({ ok: true });
});

router.get("/lease/:id", (req: Request, res: Response) => {
  const lease = requireLease(req, res);
  if (!lease) return;
  res.json({ lease });
});

// ─────────────────────────── helpers ───────────────────────────

/** The session address (from `Authorization: Bearer <session>`), or 401. */
function requireSession(req: Request, res: Response): string | null {
  const address = addressFromSession(req.header("authorization"));
  if (!address) {
    res.status(401).json({ error: "sign in with your wallet first" });
    return null;
  }
  return address;
}

/** Verify the bearer lease token matches the :id route param. */
function requireLease(req: Request, res: Response) {
  const tokenLeaseId = leaseIdFromAuthHeader(req.header("authorization"));
  if (!tokenLeaseId || tokenLeaseId !== req.params.id) {
    res.status(401).json({ error: "invalid or missing lease token" });
    return null;
  }
  const lease = getLease(req.params.id);
  if (!lease) {
    res.status(404).json({ error: "lease not found" });
    return null;
  }
  return lease;
}
