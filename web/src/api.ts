import type {
  ComputeNode,
  ExplorerNode,
  Lease,
  PlatformInfo,
  RunResponse,
  SandboxAccess,
  WalletSummary,
} from "@tendril/shared";

export const REGISTRY_URL =
  (import.meta.env.VITE_REGISTRY_URL as string | undefined) ?? "http://localhost:4000";

export type ActiveLease = {
  leaseId: string;
  access: SandboxAccess;
  expiresAt: number;
  rateStroopsPerHour: number;
  leaseToken: string;
  nodeId: string;
  label: string;
};

/**
 * Turn a failed response into a human-readable Error. Backend errors arrive as
 * `{"error": "..."}` — surface that message instead of dumping raw JSON into
 * the UI. The status code stays in the message so 401 handling keeps working.
 */
export async function apiError(res: Response, what: string): Promise<Error> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      detail = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      detail = text;
    }
  } catch {
    /* body unreadable — status alone will have to do */
  }
  detail = detail.trim();
  return new Error(`${what} failed: ${res.status}${detail ? ` — ${detail}` : ""}`);
}

export async function fetchExplorer(): Promise<ExplorerNode[]> {
  const res = await fetch(`${REGISTRY_URL}/explorer`);
  if (!res.ok) throw await apiError(res, "explorer");
  return (await res.json()).nodes as ExplorerNode[];
}

/** Where to send top-ups + the USD→XLM rate used to show prices in XLM. */
export async function fetchPlatform(): Promise<PlatformInfo> {
  const res = await fetch(`${REGISTRY_URL}/platform`);
  if (!res.ok) throw await apiError(res, "platform");
  return res.json();
}

export async function fetchMyNodes(owner: string): Promise<ComputeNode[]> {
  const res = await fetch(`${REGISTRY_URL}/nodes?owner=${owner}`);
  if (!res.ok) throw await apiError(res, "nodes");
  return (await res.json()).nodes as ComputeNode[];
}

/** The signed-in wallet's balance + deposit/spend history. */
export async function fetchWallet(token: string): Promise<WalletSummary> {
  const res = await fetch(`${REGISTRY_URL}/wallet`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await apiError(res, "wallet");
  return res.json();
}

/** Rent a node — spends the prepaid balance, no per-rent signing. */
export async function rentNode(
  token: string,
  nodeId: string,
): Promise<Omit<ActiveLease, "nodeId" | "label">> {
  const res = await fetch(`${REGISTRY_URL}/rent/${nodeId}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw await apiError(res, "rent");
  return res.json();
}

/** Poll a lease to refresh its projected expiry + status as the meter bills it. */
export async function fetchLease(leaseId: string, leaseToken: string): Promise<Lease> {
  const res = await fetch(`${REGISTRY_URL}/lease/${leaseId}`, {
    headers: { authorization: `Bearer ${leaseToken}` },
  });
  if (!res.ok) throw await apiError(res, "lease");
  return (await res.json()).lease as Lease;
}

export async function runJob(
  leaseId: string,
  leaseToken: string,
  payload: string,
): Promise<RunResponse> {
  const res = await fetch(`${REGISTRY_URL}/lease/${leaseId}/run`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${leaseToken}` },
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw await apiError(res, "run");
  return res.json();
}

export async function releaseLease(leaseId: string, leaseToken: string): Promise<void> {
  const res = await fetch(`${REGISTRY_URL}/lease/${leaseId}/release`, {
    method: "POST",
    headers: { authorization: `Bearer ${leaseToken}` },
  });
  // 404/410 = the lease is already gone server-side — that's the state the user
  // wanted, so only a live failure (5xx, auth) should block closing the panel.
  if (!res.ok && res.status !== 404 && res.status !== 410) throw await apiError(res, "release");
}
