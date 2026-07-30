import { useEffect, useState } from "react";
import type { LeaderboardEntry, LeaderboardSort } from "@fallow/shared";
import { formatXlm } from "@fallow/shared";
import { fetchActiveCompute, fetchLeaderboard, fetchUserGrowth } from "../api";

interface Pt {
  date: string;
  value: number;
}

function short(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function fmtDay(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * A single-series line+area chart over daily points, in the same inline-SVG
 * house style as BalanceChart (reuses its `.bc-*` marks), plus a hover
 * crosshair + tooltip so exact values are readable.
 */
function TimeSeriesChart({
  title,
  points,
  formatValue = (v) => String(v),
}: {
  title: string;
  points: Pt[];
  formatValue?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null); // index into points

  if (points.length === 0) {
    return (
      <div className="panel chart-card">
        <h3>{title}</h3>
        <p className="muted small">No data yet.</p>
      </div>
    );
  }

  const W = 760;
  const H = 220;
  const pad = { l: 10, r: 10, t: 16, b: 26 };
  const tMin = new Date(`${points[0].date}T00:00:00Z`).getTime();
  const tMax = new Date(`${points[points.length - 1].date}T00:00:00Z`).getTime();
  const vMax = Math.max(...points.map((p) => p.value));
  const vMin = 0;
  const span = vMax - vMin || 1;
  const tSpan = tMax - tMin || 1;

  const x = (t: number) => pad.l + ((t - tMin) / tSpan) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - ((v - vMin) / span) * (H - pad.t - pad.b);

  const xy = points.map((p) => ({ ...p, t: new Date(`${p.date}T00:00:00Z`).getTime() }));
  const plot = points.length === 1 ? [xy[0], { ...xy[0], t: tMax + 1 }] : xy;
  const line = plot.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(plot[plot.length - 1].t).toFixed(1)},${(H - pad.b).toFixed(1)} L${x(plot[0].t).toFixed(1)},${(H - pad.b).toFixed(1)} Z`;
  const last = xy[xy.length - 1];

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    // nearest point by x-distance
    let nearest = 0;
    let best = Infinity;
    xy.forEach((p, i) => {
      const d = Math.abs(x(p.t) - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const hp = hover !== null ? xy[hover] : null;

  return (
    <div className="panel chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <span className="chart-now">{formatValue(last.value)}</span>
      </div>
      <figure className="balance-chart">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={title}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <line className="bc-grid" x1={pad.l} y1={y(vMax)} x2={W - pad.r} y2={y(vMax)} />
          <line className="bc-grid" x1={pad.l} y1={y(vMin)} x2={W - pad.r} y2={y(vMin)} />

          <path className="bc-area" d={area} />
          <path className="bc-line" d={line} />

          {xy.map((p, i) => (
            <circle key={i} className="bc-dot" cx={x(p.t)} cy={y(p.value)} r={2.6} />
          ))}
          <circle className="bc-dot bc-dot-now" cx={x(last.t)} cy={y(last.value)} r={4.5} />

          <text className="bc-vlabel" x={pad.l} y={y(vMax) - 6}>{formatValue(vMax)}</text>
          <text className="bc-tlabel" x={pad.l} y={H - 8} textAnchor="start">{fmtDay(points[0].date)}</text>
          <text className="bc-tlabel" x={W - pad.r} y={H - 8} textAnchor="end">
            {fmtDay(points[points.length - 1].date)}
          </text>

          {hp && (
            <>
              <line
                x1={x(hp.t)}
                y1={pad.t}
                x2={x(hp.t)}
                y2={H - pad.b}
                stroke="var(--green)"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.5}
              />
              <circle cx={x(hp.t)} cy={y(hp.value)} r={5} fill="var(--cream)" stroke="var(--green)" strokeWidth={2.5} />
              <g transform={`translate(${Math.min(Math.max(x(hp.t), 60), W - 60)}, ${pad.t + 12})`}>
                <rect x={-46} y={-14} width={92} height={30} rx={4} fill="var(--green)" />
                <text x={0} y={-1} textAnchor="middle" fill="var(--cream)" fontFamily="var(--mono)" fontSize={10} fontWeight={700}>
                  {formatValue(hp.value)}
                </text>
                <text x={0} y={11} textAnchor="middle" fill="var(--cream)" fontFamily="var(--mono)" fontSize={9} opacity={0.8}>
                  {fmtDay(hp.date)}
                </text>
              </g>
            </>
          )}
        </svg>
      </figure>
    </div>
  );
}

const SORTS: { key: LeaderboardSort; label: string }[] = [
  { key: "topup", label: "Top-up amount" },
  { key: "leasetime", label: "Lease time" },
  { key: "leasespan", label: "Lease span" },
];

function formatEntryValue(sort: LeaderboardSort, value: number): string {
  if (sort === "topup") return formatXlm(value);
  if (sort === "leasetime") {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return value < 1 ? "< 1 day" : `${value.toFixed(1)} days`;
}

/** Ranked list for the current sort, as thin single-hue bars (length ∝ value). */
function Leaderboard() {
  const [sort, setSort] = useState<LeaderboardSort>("topup");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchLeaderboard(sort)
      .then((e) => alive && setEntries(e))
      .catch(() => alive && setEntries([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [sort]);

  const max = Math.max(...entries.map((e) => e.value), 1);

  return (
    <div className="panel chart-card leaderboard">
      <div className="chart-head">
        <h3>Leaderboard</h3>
      </div>

      <div className="sort-toggle" role="radiogroup" aria-label="Sort leaderboard by">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={sort === s.key}
            className={`btn ghost small${sort === s.key ? " active" : ""}`}
            onClick={() => setSort(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted small">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted small">No data yet.</p>
      ) : (
        <ol className="leaderboard-list">
          {entries.map((e, i) => (
            <li key={e.address} className="leaderboard-row">
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-addr" title={e.address}>{short(e.address)}</span>
              <span className="lb-bar-track">
                <span className="lb-bar" style={{ width: `${Math.max(4, (e.value / max) * 100)}%` }} />
              </span>
              <span className="lb-value">{formatEntryValue(sort, e.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Platform-wide metrics: user growth, daily active compute users, and a
 *  sortable leaderboard. All public data — no wallet/session required. */
export function Metrics() {
  const [growth, setGrowth] = useState<Pt[]>([]);
  const [active, setActive] = useState<Pt[]>([]);

  useEffect(() => {
    fetchUserGrowth()
      .then((points) => setGrowth(points.map((p) => ({ date: p.date, value: p.totalUsers }))))
      .catch(() => setGrowth([]));
    fetchActiveCompute()
      .then((points) => setActive(points.map((p) => ({ date: p.date, value: p.activeUsers }))))
      .catch(() => setActive([]));
  }, []);

  return (
    <section className="page">
      <div className="section-head">
        <p className="kicker">// PLATFORM</p>
        <h2 className="display section-title">METRICS</h2>
      </div>
      <div className="rule"></div>

      <TimeSeriesChart title="Users over time" points={growth} formatValue={(v) => String(Math.round(v))} />
      <TimeSeriesChart title="Active users on compute" points={active} formatValue={(v) => String(Math.round(v))} />
      <Leaderboard />
    </section>
  );
}
