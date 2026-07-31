import type { WalletStats, WalletSummary } from "@fallow/shared";
import { formatXlm } from "@fallow/shared";
import { BalanceChart } from "./BalanceChart";

interface Props {
  wallet: WalletSummary | null;
  address: string | null;
  signedIn: boolean;
}

function fmtDuration(seconds: number): string {
  if (!seconds) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function short(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

const explorerTx = (id: string) => `https://stellar.expert/explorer/testnet/tx/${id}`;
const explorerAccount = (addr: string) => `https://stellar.expert/explorer/testnet/account/${addr}`;

/** Use server-side stats when present; otherwise derive from the loaded history
 *  (so the dashboard still works before the backend is rebuilt). */
function resolveStats(w: WalletSummary): WalletStats {
  if (w.stats) return w.stats;
  const sum = <T,>(arr: T[], pick: (x: T) => number) => arr.reduce((a, x) => a + pick(x), 0);
  return {
    totalSpentStroops: sum(w.charges, (c) => c.amountStroops),
    totalToppedUpStroops: sum(w.topups, (t) => t.amountStroops),
    totalLeaseSeconds: sum(w.charges, (c) => c.seconds),
    leaseCount: w.charges.length,
    totalEarnedStroops: sum(w.payouts ?? [], (p) => p.amountStroops),
    payoutCount: (w.payouts ?? []).length,
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

/** Address-only account dashboard: lifetime stats + spend/top-up history. */
export function Dashboard({ wallet, address, signedIn }: Props) {
  return (
    <section className="page">
      <div className="section-head">
        <p className="kicker">// ACCOUNT</p>
        <h2 className="display section-title">DASHBOARD</h2>
      </div>
      <div className="rule"></div>

      {!signedIn || !address ? (
        <p className="muted dash-note">Connect your wallet and sign in to view your dashboard.</p>
      ) : !wallet ? (
        <p className="muted dash-note">Loading your account…</p>
      ) : (
        (() => {
          const stats = resolveStats(wallet);
          return (
        <>
          <p className="dash-addr">{address}</p>

          <div className="stat-grid">
            <Stat label="Balance" value={formatXlm(wallet.balanceStroops)} />
            <Stat label="Total spent" value={formatXlm(stats.totalSpentStroops)} />
            <Stat label="Total topped up" value={formatXlm(stats.totalToppedUpStroops)} />
            <Stat label="Lease time" value={fmtDuration(stats.totalLeaseSeconds)} />
            <Stat label="Leases taken" value={String(stats.leaseCount)} />
            {stats.payoutCount > 0 && (
              <Stat label="Earned (contributor)" value={formatXlm(stats.totalEarnedStroops)} />
            )}
          </div>

          <BalanceChart
            topups={wallet.topups}
            charges={wallet.charges}
            currentBalance={wallet.balanceStroops}
          />

          <div className="dash-cols panel">
            <div>
              <h3>Spend history</h3>
              {wallet.charges.length === 0 ? (
                <p className="muted small">No charges yet.</p>
              ) : (
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Time</th>
                      <th>Paid to</th>
                      <th>Txn</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.charges.map((c) => (
                      <tr key={c.id}>
                        <td className="num">−{formatXlm(c.amountStroops)}</td>
                        <td className="num">{fmtDuration(c.seconds)}</td>
                        <td>
                          <a href={explorerAccount(c.payToAddr)} target="_blank" rel="noreferrer" title={c.payToAddr}>
                            {short(c.payToAddr)}
                          </a>
                        </td>
                        <td>
                          {c.payoutTxid ? (
                            <a href={explorerTx(c.payoutTxid)} target="_blank" rel="noreferrer" title={c.payoutTxid}>
                              {short(c.payoutTxid)}
                            </a>
                          ) : (
                            <span className="muted" title="Payout wasn't sent on-chain (PLATFORM_PRIVATE_KEY unset, or it failed)">
                              unpaid
                            </span>
                          )}
                        </td>
                        <td>{new Date(c.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <h3>Top-up history</h3>
              {wallet.topups.length === 0 ? (
                <p className="muted small">No deposits yet.</p>
              ) : (
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Txn</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallet.topups.map((t) => (
                      <tr key={t.txid}>
                        <td className="num">+{formatXlm(t.amountStroops)}</td>
                        <td>
                          <a href={explorerTx(t.txid)} target="_blank" rel="noreferrer" title={t.txid}>
                            {short(t.txid)}
                          </a>
                        </td>
                        <td>{new Date(t.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
          );
        })()
      )}
    </section>
  );
}
