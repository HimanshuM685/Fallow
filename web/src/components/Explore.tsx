import { useEffect, useState } from "react";
import type { ExplorerNode } from "@fallow/shared";
import { formatXlm, usdToStroops } from "@fallow/shared";
import { type ActiveLease, fetchExplorer, fetchPlatform, rentNode } from "../api";
import type { Session } from "../App";

interface Props {
  session: Session | null;
  balanceStroops: number;
  onLeased: (lease: ActiveLease) => void;
}

type SortBy = "price-asc" | "price-desc";

export function Explore({ session, balanceStroops, onLeased }: Props) {
  const [nodes, setNodes] = useState<ExplorerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renting, setRenting] = useState<string | null>(null);
  const [xlmUsdPrice, setXlmUsdPrice] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("price-asc");
  const [gpuOnly, setGpuOnly] = useState(false);
  const [minRamGb, setMinRamGb] = useState(0);

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

  /** Rough cost of an hour on this node — capped at the balance, since the lease
   *  ends when the wallet runs dry and you can never be billed past it. */
  const estimateLabel = (usdPerHour: number) => {
    const r = rateStroops(usdPerHour);
    if (!r || !session) return null;
    const capped = balanceStroops < r;
    return `est. ${formatXlm(Math.min(r, balanceStroops))} for 1 hr${capped ? " (your whole balance)" : ""}`;
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

  const maxRamGb = Math.max(1, ...nodes.map((n) => Math.ceil(n.ramMb / 1024)));
  const q = search.trim().toLowerCase();
  const visible = nodes
    .filter((n) => !q || n.label.toLowerCase().includes(q))
    .filter((n) => !gpuOnly || !!n.gpu)
    .filter((n) => n.ramMb >= minRamGb * 1024)
    .sort((a, b) =>
      sortBy === "price-asc" ? a.pricePerHourUsd - b.pricePerHourUsd : b.pricePerHourUsd - a.pricePerHourUsd,
    );

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
      {nodes.length > 0 && (
        <div className="explore-filters">
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-search"
            aria-label="Search nodes by name"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="filter-select"
            aria-label="Sort by"
          >
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
          <label className="filter-checkbox">
            <input type="checkbox" checked={gpuOnly} onChange={(e) => setGpuOnly(e.target.checked)} />
            GPU only
          </label>
          <label className="filter-slider">
            Min RAM: {minRamGb} GB
            <input
              type="range"
              min={0}
              max={maxRamGb}
              step={1}
              value={minRamGb}
              onChange={(e) => setMinRamGb(Number(e.target.value))}
              aria-label="Minimum RAM in GB"
            />
          </label>
        </div>
      )}
      {nodes.length > 0 && visible.length === 0 && (
        <p className="muted">No nodes match these filters.</p>
      )}
      <div className="grid">
        {visible.map((n) => (
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
            {estimateLabel(n.pricePerHourUsd) && (
              <div className="muted small">{estimateLabel(n.pricePerHourUsd)}</div>
            )}
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
