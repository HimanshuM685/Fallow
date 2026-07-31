import type { Charge, TopUp } from "@fallow/shared";
import { formatXlm, formatXlmShort } from "@fallow/shared";

interface Props {
  topups: TopUp[];
  charges: Charge[];
  /** Current balance — the series is anchored so its last point equals this. */
  currentBalance: number;
}

interface Pt {
  t: number;
  v: number;
}

/**
 * Reconstruct historical balance from deposits (+) and charges (−), anchored so
 * the final point matches the live balance. Drawn as an on-palette inline SVG
 * area+line chart (no charting dependency).
 */
export function BalanceChart({ topups, charges, currentBalance }: Props) {
  // Each deposit raises the balance, each charge lowers it.
  const events = [
    ...topups.map((t) => ({ t: t.createdAt, delta: t.amountStroops })),
    ...charges.map((c) => ({ t: c.createdAt, delta: -c.amountStroops })),
  ].sort((a, b) => a.t - b.t);

  if (events.length === 0) {
    return (
      <div className="panel chart-card">
        <h3>Balance over time</h3>
        <p className="muted small">No activity yet — top up to start your history.</p>
      </div>
    );
  }

  // balanceAfter[k] = (current - totalDelta) + cumulativeDelta up to k.
  const total = events.reduce((s, e) => s + e.delta, 0);
  const start = currentBalance - total; // balance just before the earliest event shown
  const pts: Pt[] = [{ t: events[0].t, v: start }];
  let running = start;
  for (const e of events) {
    running += e.delta;
    pts.push({ t: e.t, v: running });
  }

  // ── geometry ──────────────────────────────────────────────────────────
  const W = 760;
  const H = 110; // half-height: two charts fit on one screen without scrolling
  const pad = { l: 10, r: 10, t: 16, b: 26 };
  const tMin = pts[0].t;
  const tMax = pts[pts.length - 1].t;
  const vMax = Math.max(...pts.map((p) => p.v));
  const vMin = Math.min(...pts.map((p) => p.v), 0);
  const span = vMax - vMin || 1;
  const tSpan = tMax - tMin || 1;

  const x = (t: number) => pad.l + ((t - tMin) / tSpan) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - ((v - vMin) / span) * (H - pad.t - pad.b);

  // Single-event series: hold a flat line across the width so it still reads.
  const xy = pts.length === 1 ? [pts[0], { ...pts[0], t: tMax + 1 }] : pts;
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(xy[xy.length - 1].t).toFixed(1)},${(H - pad.b).toFixed(1)} L${x(xy[0].t).toFixed(1)},${(H - pad.b).toFixed(1)} Z`;
  const last = pts[pts.length - 1];

  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="panel chart-card">
      <div className="chart-head">
        <h3>Balance over time</h3>
        <span className="chart-now" title={formatXlm(currentBalance)}>{formatXlmShort(currentBalance)}</span>
      </div>
      <figure className="balance-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Historical balance">
          {/* peak / floor reference lines */}
          <line className="bc-grid" x1={pad.l} y1={y(vMax)} x2={W - pad.r} y2={y(vMax)} />
          <line className="bc-grid" x1={pad.l} y1={y(vMin)} x2={W - pad.r} y2={y(vMin)} />

          <path className="bc-area" d={area} />
          <path className="bc-line" d={line} />

          {/* point markers */}
          {pts.map((p, i) => (
            <circle key={i} className="bc-dot" cx={x(p.t)} cy={y(p.v)} r={2.6} />
          ))}
          {/* highlight the live balance */}
          <circle className="bc-dot bc-dot-now" cx={x(last.t)} cy={y(last.v)} r={4.5} />

          {/* value labels */}
          <text className="bc-vlabel" x={pad.l} y={y(vMax) - 6}>{formatXlmShort(vMax)}</text>
          {vMin !== vMax && (
            <text className="bc-vlabel" x={pad.l} y={y(vMin) - 6}>{formatXlmShort(vMin)}</text>
          )}
          {/* date range */}
          <text className="bc-tlabel" x={pad.l} y={H - 8} textAnchor="start">{fmtDate(tMin)}</text>
          <text className="bc-tlabel" x={W - pad.r} y={H - 8} textAnchor="end">{fmtDate(tMax)}</text>
        </svg>
      </figure>
    </div>
  );
}
