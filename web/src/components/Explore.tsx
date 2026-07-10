import { useEffect, useState } from "react";
import type { ExplorerNode } from "@tendril/shared";
import { formatXlm, usdToStroops } from "@tendril/shared";
import { type ActiveLease, fetchExplorer, fetchPlatform, rentNode } from "../api";
import type { Session } from "../App";

interface Props {
  session: Session | null;
  balanceStroops: number;
  onLeased: (lease: ActiveLease) => void;
}

export function Explore({ session, balanceStroops, onLeased }: Props) {
  const [nodes, setNodes] = useState<ExplorerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renting, setRenting] = useState<string | null>(null);
  const [xlmUsdPrice, setXlmUsdPrice] = useState<number | null>(null);

  useEffect(() => {
    fetchPlatform()
      .then((p) => setXlmUsdPrice(p.xlmUsdPrice))
      .catch(() => {});
  }, []);

  // Poll the node list, pausing while the tab is hidden — same pattern as the
  // balance poll in App. A stale "can't reach backend" error clears itself on
  // the next successful load.
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchExplorer()
        .then((n) => {
          if (!alive) return;
          setNodes(n);
          setError((prev) => (prev && /explorer failed/.test(prev) ? null : prev));
        })
        .catch((e) => alive && setError((e as Error).message))
        .finally(() => alive && setLoading(false));
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (timer) return;
      load();
      timer = setInterval(load, 4000);
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /** Per-hour rate in stroops. */
  const rateStroops = (usdPerHour: number) =>
    xlmUsdPrice ? usdToStroops(usdPerHour, xlmUsdPrice) : null;

  const priceLabel = (usdPerHour: number) => {
    const r = rateStroops(usdPerHour);
    return r ? `~${formatXlm(r)}/hr` : `$${usdPerHour}/hr`;
  };

  /** Minutes the current balance buys at this node's hourly rate. */
  const minutesLabel = (usdPerHour: number) => {
    const r = rateStroops(usdPerHour);
    if (!r || !session) return null;
    return `≈ ${Math.floor((balanceStroops / r) * 60)} min on your balance`;
  };

  async function rent(node: ExplorerNode) {
    if (!session) return;
    if (balanceStroops <= 0) {
      setError("Insufficient balance — top up your wallet first.");
      return;
    }
    setRenting(node.id);
    setError(null);
    try {
      const lease = await rentNode(session.token, node.id);
      onLeased({ ...lease, nodeId: node.id, label: node.label });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRenting(null);
    }
  }

  return (
    <div>
      <p className="muted">
        Live nodes from <code>GET /explorer</code> (free). Rent one to get a sandboxed SSH
        session — billed by the hour from your prepaid XLM balance, charged when you release.
      </p>
      {error && <div className="error">{error}</div>}
      {!session && (
        <p className="muted">Connect your wallet and sign in to load a balance and rent.</p>
      )}
      {loading && nodes.length === 0 && <p className="muted">Scanning for nodes…</p>}
      {!loading && nodes.length === 0 && (
        <p className="muted">No nodes online. Start a contributor agent.</p>
      )}
      <div className="grid">
        {nodes.map((n) => (
          <div className="card" key={n.id}>
            <div className="card-head">
              <strong>{n.label}</strong>
              <span className="badge online">online</span>
            </div>
            <ul className="specs">
              <li>{n.cpuCores} vCPU</li>
              <li>{(n.ramMb / 1024).toFixed(1)} GB RAM</li>
              <li>{n.gpu ?? "no GPU"}</li>
            </ul>
            <div className="price">{priceLabel(n.pricePerHourUsd)}</div>
            {minutesLabel(n.pricePerHourUsd) && (
              <div className="muted small">{minutesLabel(n.pricePerHourUsd)}</div>
            )}
            <button
              className="btn"
              disabled={!session || renting !== null}
              title={session ? "" : "Sign in to rent"}
              onClick={() => rent(n)}
            >
              {renting === n.id ? "Starting…" : "Rent"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
