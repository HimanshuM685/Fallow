import { Keypair } from "@stellar/stellar-sdk";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { config } from "./config.js";

// ─────────────────────────── nonce challenge ───────────────────────────
// A contributor agent proves control of its owner address by signing a
// short-lived nonce with its Stellar Keypair (which the registry verifies with
// Keypair.verify over the raw nonce bytes).

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const NONCE_TTL_MS = 5 * 60_000;
const nonces = new Map<string, NonceEntry>();

export function issueNonce(address: string): string {
  const nonce = `tendril-auth:${nanoid(24)}`;
  nonces.set(address, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

/**
 * Verify an agent's `hello`: the signature must be a valid ed25519 signature
 * (Keypair.sign) over the most recently issued nonce for `ownerAddr`.
 */
export function verifyAgentHello(
  ownerAddr: string,
  nonce: string,
  signatureB64: string,
): boolean {
  const entry = nonces.get(ownerAddr);
  if (!entry) return false;
  if (entry.nonce !== nonce) return false;
  if (Date.now() > entry.expiresAt) {
    nonces.delete(ownerAddr);
    return false;
  }
  let ok = false;
  try {
    const sig = Buffer.from(signatureB64, "base64");
    ok = Keypair.fromPublicKey(ownerAddr).verify(Buffer.from(nonce), sig);
  } catch {
    return false;
  }
  if (ok) nonces.delete(ownerAddr); // one-time use
  return ok;
}

// ─────────────────────────── lease tokens ───────────────────────────
// /rent returns a lease-scoped JWT. /run, /release and GET /lease/:id require
// it. The settled XLM payment is what authorizes minting the token in the first place.

export function issueLeaseToken(leaseId: string): string {
  return jwt.sign({ leaseId }, config.jwtSecret, { expiresIn: "24h" });
}

export function verifyLeaseToken(token: string): { leaseId: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { leaseId: string };
    return payload.leaseId ? { leaseId: payload.leaseId } : null;
  } catch {
    return null;
  }
}

/** Express helper: extract a verified leaseId from the Authorization header. */
export function leaseIdFromAuthHeader(header?: string): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const payload = verifyLeaseToken(header.slice("Bearer ".length));
  return payload?.leaseId ?? null;
}

// ─────────────────────── wallet login + session tokens ───────────────────────
// No x402. A user proves control of their address by signing a short-lived
// login nonce (bound via the memo of a 1-stroop self-payment). On success we mint a
// session JWT carrying their address; spending the prepaid balance (rent,
// top-up, wallet read) requires that token, so nobody can spend someone else's.

/** Issue a login nonce bound to `address` (the client signs it as a txn note). */
export function issueWalletNonce(address: string): string {
  return jwt.sign({ address, kind: "login" }, config.jwtSecret, { expiresIn: "5m" });
}

/** Verify a login nonce belongs to `address`. */
export function verifyWalletNonce(nonce: string, address: string): boolean {
  try {
    const p = jwt.verify(nonce, config.jwtSecret) as { address?: string; kind?: string };
    return p.kind === "login" && p.address === address;
  } catch {
    return false;
  }
}

/** Mint a session token identifying the logged-in wallet address. */
export function issueSession(address: string): string {
  return jwt.sign({ address, kind: "session" }, config.jwtSecret, { expiresIn: "7d" });
}

/** Extract a verified address from an `Authorization: Bearer <session>` header. */
export function addressFromSession(header?: string): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const p = jwt.verify(header.slice("Bearer ".length), config.jwtSecret) as {
      address?: string;
      kind?: string;
    };
    return p.kind === "session" && p.address ? p.address : null;
  } catch {
    return null;
  }
}
