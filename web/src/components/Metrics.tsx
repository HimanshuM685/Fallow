import { useEffect, useState } from "react";
import type { ContributorSort, LeaderboardEntry, LeaderboardSort } from "@fallow/shared";
import { formatXlm } from "@fallow/shared";
import {
  fetchActiveCompute,
  fetchContributorLeaderboard,
  fetchLeaderboard,
  fetchUserGrowth,
} from "../api";

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

function daysBetween(a: string, b: string): number {
  const ta = new Date(`${a}T00:00:00Z`).getTime();
  const tb = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((tb - ta) / 86400000);
}

/**
 * A single-series line+area chart over daily points, in the same inline-SVG
 * house style as BalanceChart (reuses its `.bc-*` marks), plus a hover
 * crosshair + tooltip so exact values are readable.
 *
 * `xMode="time"` spaces points by real elapsed time (right for a true daily
 * metric). `xMode="index"` spaces points evenly by event order instead — for
 * a sparse cumulative series (most days have no new signups, so only "gain"
 * days get a point), a time-scaled axis lets one rare long gap dominate the
 * scale and flatten every real step. Index spacing keeps every gain visible
 * as a step regardless of the calendar gap, which is instead called out as a
 * small "Xd gap" label between the two points.
 */
function TimeSeriesChart({
  title,
  points,
  formatValue = (v) => String(v),
  xMode = "time",
}: {
  title: string;
  points: Pt[];
  formatValue?: (v: number) => string;
  xMode?: "time" | "index";
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
  const vMax = Math.max(...points.map((p) => p.value));
  const vMin = 0;
  const span = vMax - vMin || 1;
  const n = points.length;

  // Screen-x per point, in either mode — everything below reads from this,
  // so the two modes only differ in this one array.
  const xPos: number[] =
    xMode === "index"
      ? points.map((_, i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r)))
      : (() => {
          const tMin = new Date(`${points[0].date}T00:00:00Z`).getTime();
          const tMax = new Date(`${points[n - 1].date}T00:00:00Z`).getTime();
          const tSpan = tMax - tMin || 1;
          return points.map((p) => pad.l + ((new Date(`${p.date}T00:00:00Z`).getTime() - tMin) / tSpan) * (W - pad.l - pad.r));
        })();
  const y = (v: number) => H - pad.b - ((v - vMin) / span) * (H - pad.t - pad.b);

  const plotX = n === 1 ? [xPos[0], xPos[0] + 1] : xPos;
  const plotV = n === 1 ? [points[0].value, points[0].value] : points.map((p) => p.value);
  const line = plotX.map((px, i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${y(plotV[i]).toFixed(1)}`).join(" ");
  const area = `${line} L${plotX[plotX.length - 1].toFixed(1)},${(H - pad.b).toFixed(1)} L${plotX[0].toFixed(1)},${(H - pad.b).toFixed(1)} Z`;
  const lastIdx = n - 1;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    xPos.forEach((xp, i) => {
      const d = Math.abs(xp - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const hp = hover !== null ? points[hover] : null;
  const hx = hover !== null ? xPos[hover] : 0;

  return (
    <div className="panel chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
        <span className="chart-now">{formatValue(points[lastIdx].value)}</span>
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

          {xMode === "index" &&
            points.slice(1).map((p, i) => {
              const gap = daysBetween(points[i].date, p.date);
              if (gap <= 1) return null;
              const mid = (xPos[i] + xPos[i + 1]) / 2;
              return (
                <text key={i} className="bc-gap" x={mid} y={H - pad.b - 8} textAnchor="middle">
                  {gap}d gap
                </text>
              );
            })}

          {points.map((p, i) => (
            <circle key={i} className="bc-dot" cx={xPos[i]} cy={y(p.value)} r={2.6} />
          ))}
          <circle className="bc-dot bc-dot-now" cx={xPos[lastIdx]} cy={y(points[lastIdx].value)} r={4.5} />

          <text className="bc-vlabel" x={pad.l} y={y(vMax) - 6}>{formatValue(vMax)}</text>
          <text className="bc-tlabel" x={pad.l} y={H - 8} textAnchor="start">{fmtDay(points[0].date)}</text>
          <text className="bc-tlabel" x={W - pad.r} y={H - 8} textAnchor="end">
            {fmtDay(points[points.length - 1].date)}
          </text>

          {hp && (
            <>
              <line
                x1={hx}
                y1={pad.t}
                x2={hx}
                y2={H - pad.b}
                stroke="var(--green)"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.5}
              />
              <circle cx={hx} cy={y(hp.value)} r={5} fill="var(--cream)" stroke="var(--green)" strokeWidth={2.5} />
              <g transform={`translate(${Math.min(Math.max(hx, 60), W - 60)}, ${pad.t + 12})`}>
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
  if (sort === "leasetime") return value === 1 ? "1 lease" : `${value} leases`;
  // leasespan — total lifetime compute time, in seconds.
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
        <h3>Top users</h3>
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

const CONTRIBUTOR_SORTS: { key: ContributorSort; label: string }[] = [
  { key: "leasetime", label: "Time served" },
  { key: "servecount", label: "Times served" },
];

function formatContributorValue(sort: ContributorSort, value: number): string {
  if (sort === "servecount") return value === 1 ? "1 lease" : `${value} leases`;
  // leasetime — total lifetime compute time served, in seconds.
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Ranked list of top contributors, by time served or total leases served —
 *  gives contributors a reason to keep their node online past a one-off demo. */
function ContributorLeaderboard() {
  const [sort, setSort] = useState<ContributorSort>("leasetime");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchContributorLeaderboard(sort)
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
        <h3>Top contributors</h3>
      </div>

      <div className="sort-toggle" role="radiogroup" aria-label="Sort contributor leaderboard by">
        {CONTRIBUTOR_SORTS.map((s) => (
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
              <span className="lb-value">{formatContributorValue(sort, e.value)}</span>
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

      <TimeSeriesChart
        title="Users over time"
        points={growth}
        formatValue={(v) => String(Math.round(v))}
        xMode="index"
      />
      <TimeSeriesChart title="Active users on compute" points={active} formatValue={(v) => String(Math.round(v))} />
      <Leaderboard />
      <ContributorLeaderboard />
    </section>
  );
}
