import { nanoid } from "nanoid";
import type { ComputeNode, ExplorerNode } from "@tendril/shared";
import { isOnline } from "@tendril/shared";
import { config } from "./config.js";

/**
 * In-memory node registry. Nodes are ephemeral — a contributor comes online,
 * heartbeats, and goes away — so they don't belong in the database (storing them
 * meant a DB write on every heartbeat). The live set lives here instead; only
 * wallet money state is persisted (see db.ts).
 */
const nodes = new Map<string, ComputeNode>();

export interface UpsertNodeInput {
  id?: string;
  ownerAddr: string;
  payToAddr: string;
  label: string;
  cpuCores: number;
  ramMb: number;
  gpu: string | null;
  pricePerHourUsd: number;
}

function withStatus(node: ComputeNode): ComputeNode {
  return {
    ...node,
    status: isOnline(node.lastHeartbeat, config.heartbeatTimeoutMs) ? "online" : "offline",
  };
}

/** Register a new node or re-attach to an existing one, refreshing its heartbeat. */
export function upsertNode(input: UpsertNodeInput): ComputeNode {
  const now = Date.now();
  const id = input.id || nanoid(10);
  const existing = nodes.get(id);
  const node: ComputeNode = {
    id,
    ownerAddr: input.ownerAddr,
    payToAddr: input.payToAddr,
    label: input.label,
    cpuCores: input.cpuCores,
    ramMb: input.ramMb,
    gpu: input.gpu,
    pricePerHourUsd: input.pricePerHourUsd,
    lastHeartbeat: now,
    createdAt: existing?.createdAt ?? now,
    status: "online",
  };
  nodes.set(id, node);
  return node;
}

export function getNode(id: string): ComputeNode | undefined {
  const node = nodes.get(id);
  return node ? withStatus(node) : undefined;
}

export function touchHeartbeat(id: string): void {
  const node = nodes.get(id);
  if (node) node.lastHeartbeat = Date.now();
}

/** Mark a node offline immediately (e.g. on socket disconnect). */
export function markOffline(id: string): void {
  const node = nodes.get(id);
  if (node) node.lastHeartbeat = 0;
}

export function listNodesByOwner(ownerAddr: string): ComputeNode[] {
  return [...nodes.values()]
    .filter((n) => n.ownerAddr === ownerAddr)
    .map(withStatus)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function listOnlineNodes(): ExplorerNode[] {
  return [...nodes.values()]
    .map(withStatus)
    .filter((n) => n.status === "online")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ id, ownerAddr, payToAddr, label, cpuCores, ramMb, gpu, pricePerHourUsd, status }) => ({
      id,
      ownerAddr,
      payToAddr,
      label,
      cpuCores,
      ramMb,
      gpu,
      pricePerHourUsd,
      status,
    }));
}
