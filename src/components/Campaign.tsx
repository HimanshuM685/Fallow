"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ADMIN_ADDRESS,
  CAMPAIGN,
  CONTRACT_ID,
  EXPLORER_CONTRACT,
  EXPLORER_TX,
} from "@/lib/config";
import {
  type ActivityEvent,
  type CampaignState,
  type ErrorKind,
  type TxPhase,
  contribute,
  describeError,
  formatXlm,
  fundWithFriendbot,
  getCampaign,
  getContribution,
  getEvents,
  getXlmBalance,
  refund,
  shortAddress,
  stroopsToXlm,
  withdraw,
  xlmToStroops,
} from "@/lib/soroban";
import {
  connectWallet,
  disconnectWallet,
  restoreWallet,
  signWithWallet,
} from "@/lib/wallet";

interface Wallet {
  address: string;
  walletId: string;
  walletName?: string;
}

type ActionKind = "contribute" | "withdraw" | "refund" | null;

const PHASE_LABEL: Record<TxPhase, string> = {
  building: "Building transaction…",
  signing: "Waiting for signature in your wallet…",
  pending: "Submitting to the network…",
  success: "Confirmed",
  error: "Failed",
};

export default function Campaign() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [myContribution, setMyContribution] = useState<bigint>(0n);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const [amount, setAmount] = useState("");
  const [action, setAction] = useState<ActionKind>(null);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [error, setError] = useState<{ kind: ErrorKind; message: string } | null>(null);
  const [success, setSuccess] = useState<{ hash: string; label: string } | null>(null);
  const [funding, setFunding] = useState(false);

  const walletRef = useRef<Wallet | null>(null);
  walletRef.current = wallet;

  // ---- data loading ----

  const refreshCampaign = useCallback(async () => {
    try {
      const c = await getCampaign();
      setCampaign(c);
    } catch {
      /* transient RPC hiccup — keep last known state */
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const { events: evs } = await getEvents();
      evs.sort((a, b) => b.ledger - a.ledger);
      setEvents(evs);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshWalletState = useCallback(async (address: string) => {
    try {
      const [bal, mine] = await Promise.all([
        getXlmBalance(address),
        getContribution(address),
      ]);
      setBalance(bal);
      setMyContribution(mine);
    } catch {
      /* ignore */
    }
  }, []);

  // Initial load + restore session.
  useEffect(() => {
    refreshCampaign();
    refreshEvents();
    restoreWallet().then((w) => {
      if (w) {
        setWallet(w);
        refreshWalletState(w.address);
      }
    });
  }, [refreshCampaign, refreshEvents, refreshWalletState]);

  // Real-time: poll contract state + events every 5s (Soroban RPC has no push).
  useEffect(() => {
    const id = setInterval(() => {
      refreshCampaign();
      refreshEvents();
      const w = walletRef.current;
      if (w) refreshWalletState(w.address);
    }, 5000);
    return () => clearInterval(id);
  }, [refreshCampaign, refreshEvents, refreshWalletState]);

  // ---- derived ----

  const derived = useMemo(() => {
    if (!campaign) return null;
    const goal = campaign.goalStroops;
    const raised = campaign.raisedStroops;
    const pct = goal > 0n ? Math.min(100, Number((raised * 10000n) / goal) / 100) : 0;
    const now = Math.floor(Date.now() / 1000);
    const expired = now > campaign.deadline;
    const goalReached = raised >= goal;
    const secondsLeft = campaign.deadline - now;
    return { goal, raised, pct, expired, goalReached, secondsLeft };
  }, [campaign]);

  const isAdmin = !!wallet && !!campaign && wallet.address === campaign.admin;
  const canWithdraw = isAdmin && !!derived?.goalReached;
  const canRefund =
    !!wallet && !!derived?.expired && !derived.goalReached && myContribution > 0n;
  const busy = action !== null;

  // ---- handlers ----

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      const w = await connectWallet();
      setWallet(w);
      await refreshWalletState(w.address);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    setWallet(null);
    setBalance(null);
    setMyContribution(0n);
  }

  async function handleFriendbot() {
    if (!wallet) return;
    setFunding(true);
    setError(null);
    try {
      await fundWithFriendbot(wallet.address);
      await refreshWalletState(wallet.address);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setFunding(false);
    }
  }

  function sign(xdr: string) {
    return signWithWallet(xdr, walletRef.current!.address);
  }

  async function runAction(
    kind: Exclude<ActionKind, null>,
    fn: () => Promise<{ hash: string }>,
    successLabel: string,
  ) {
    setError(null);
    setSuccess(null);
    setAction(kind);
    setPhase("building");
    try {
      const { hash } = await fn();
      setSuccess({ hash, label: successLabel });
      setAmount("");
      await Promise.all([
        refreshCampaign(),
        refreshEvents(),
        wallet ? refreshWalletState(wallet.address) : Promise.resolve(),
      ]);
    } catch (err) {
      setPhase("error");
      setError(describeError(err));
    } finally {
      setAction(null);
      setPhase(null);
    }
  }

  function handleContribute() {
    if (!wallet || !campaign) return;
    const xlm = Number.parseFloat(amount);
    if (!Number.isFinite(xlm) || xlm <= 0) {
      setError({ kind: "unknown", message: "Enter an amount greater than 0." });
      return;
    }
    const stroops = xlmToStroops(xlm);
    // Client-side guard so "insufficient balance" is caught before signing.
    if (balance !== null && stroops > balance - xlmToStroops(1.5)) {
      setError({
        kind: "insufficient",
        message: "Insufficient testnet XLM (leave ~1.5 XLM for fees & reserves).",
      });
      return;
    }
    runAction(
      "contribute",
      () => contribute(stroops, { address: wallet.address, sign, onPhase: setPhase }),
      `Contributed ${xlm} XLM`,
    );
  }

  function handleWithdraw() {
    if (!wallet) return;
    runAction(
      "withdraw",
      () => withdraw({ address: wallet.address, sign, onPhase: setPhase }),
      "Withdrew campaign funds",
    );
  }

  function handleRefund() {
    if (!wallet) return;
    runAction(
      "refund",
      () => refund({ address: wallet.address, sign, onPhase: setPhase }),
      "Refund complete",
    );
  }

  // ---- render ----

  return (
    <div className="page">
      <div className="hero" />
      <div className="grain" />
      <div className="wrap">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">◎</span>
            <span className="brand-name">Fallow</span>
          </div>
          {wallet ? (
            <div className="wallet-chip">
              <span className="dot" />
              <span className="mono">{shortAddress(wallet.address)}</span>
              {balance !== null && (
                <span className="chip-bal">· {formatXlm(balance)} XLM</span>
              )}
              <button className="chip-btn" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="wallet-btn" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </header>

        <main className="layout">
          {/* ---- left: the campaign ---- */}
          <section className="card campaign">
            <span className="pill-tag">Open-source · Testnet</span>
            <h1 className="campaign-title">{CAMPAIGN.title}</h1>
            <p className="campaign-tagline">{CAMPAIGN.tagline}</p>

            <div className="progress-head">
              <div className="raised">
                <strong>{campaign ? formatXlm(campaign.raisedStroops) : "—"}</strong> XLM
                <span className="of-goal">
                  {" "}
                  raised of {campaign ? formatXlm(campaign.goalStroops, 0) : "—"} XLM goal
                </span>
              </div>
              <div className="pct">{derived ? Math.round(derived.pct) : 0}%</div>
            </div>
            <div className="progress">
              <div
                className={`progress-bar${derived?.goalReached ? " done" : ""}`}
                style={{ width: `${derived?.pct ?? 0}%` }}
              />
            </div>

            <div className="stats">
              <div className="stat">
                <span className="stat-num">{campaign?.donors ?? 0}</span>
                <span className="stat-label">Backers</span>
              </div>
              <div className="stat">
                <span className="stat-num">{deadlineLabel(campaign, derived)}</span>
                <span className="stat-label">
                  {derived?.expired ? "Ended" : "Time left"}
                </span>
              </div>
              <div className="stat">
                <span className={`stat-num ${statusTone(derived)}`}>
                  {statusText(derived)}
                </span>
                <span className="stat-label">Status</span>
              </div>
            </div>

            <p className="campaign-blurb">{CAMPAIGN.blurb}</p>

            <a
              className="contract-link mono"
              href={EXPLORER_CONTRACT(CONTRACT_ID)}
              target="_blank"
              rel="noreferrer"
            >
              Contract {shortAddress(CONTRACT_ID)} ↗
            </a>
          </section>

          {/* ---- right: contribute + activity ---- */}
          <section className="col">
            <div className="card widget">
              <h2 className="widget-title">Back this campaign</h2>

              {!wallet ? (
                <>
                  <p className="widget-hint">
                    Connect any Stellar wallet to contribute testnet XLM.
                  </p>
                  <button className="btn-primary" onClick={handleConnect} disabled={connecting}>
                    {connecting ? "Connecting…" : "Connect wallet"}
                  </button>
                </>
              ) : (
                <>
                  <div className="presets">
                    {CAMPAIGN.presets.map((p) => (
                      <button
                        key={p}
                        className={`preset${amount === String(p) ? " on" : ""}`}
                        onClick={() => setAmount(String(p))}
                        disabled={busy}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="amount-field">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      placeholder="Custom amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={busy}
                    />
                    <span className="unit">XLM</span>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={handleContribute}
                    disabled={busy || derived?.expired}
                  >
                    {action === "contribute" && phase
                      ? PHASE_LABEL[phase]
                      : derived?.expired
                        ? "Campaign ended"
                        : `Contribute${amount ? ` ${amount} XLM` : ""}`}
                  </button>

                  <div className="widget-foot">
                    <span>
                      You&apos;ve backed{" "}
                      <strong>{formatXlm(myContribution)} XLM</strong>
                    </span>
                    <button
                      className="link-btn"
                      onClick={handleFriendbot}
                      disabled={funding}
                    >
                      {funding ? "Funding…" : "Need test XLM?"}
                    </button>
                  </div>
                </>
              )}

              {/* transaction status / result */}
              {busy && phase && phase !== "success" && (
                <div className="status pending">
                  <span className="spinner" />
                  {PHASE_LABEL[phase]}
                </div>
              )}
              {success && (
                <div className="banner good">
                  <strong>{success.label}.</strong>
                  <a href={EXPLORER_TX(success.hash)} target="_blank" rel="noreferrer">
                    View transaction ↗
                  </a>
                </div>
              )}
              {error && (
                <div className="banner bad">
                  <strong>{errorTitle(error.kind)}</strong> {error.message}
                </div>
              )}

              {/* admin / refund actions */}
              {(canWithdraw || canRefund) && (
                <div className="secondary-actions">
                  {canWithdraw && (
                    <button className="btn-ghost" onClick={handleWithdraw} disabled={busy}>
                      {action === "withdraw" && phase ? PHASE_LABEL[phase] : "Withdraw funds (admin)"}
                    </button>
                  )}
                  {canRefund && (
                    <button className="btn-ghost" onClick={handleRefund} disabled={busy}>
                      {action === "refund" && phase
                        ? PHASE_LABEL[phase]
                        : `Refund my ${formatXlm(myContribution)} XLM`}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card activity">
              <h2 className="widget-title">
                Live activity <span className="live-dot" />
              </h2>
              {events.length === 0 ? (
                <p className="widget-hint">No on-chain activity yet. Be the first backer.</p>
              ) : (
                <ul className="activity-list">
                  {events.slice(0, 8).map((e) => (
                    <li key={e.id} className="activity-row">
                      <span className="act-icon">{eventIcon(e.kind)}</span>
                      <span className="act-text">{eventText(e)}</span>
                      <a
                        className="act-link"
                        href={EXPLORER_TX(e.txHash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </main>

        <footer className="foot">
          Runs on the <strong>Stellar testnet</strong> · admin{" "}
          <span className="mono">{shortAddress(ADMIN_ADDRESS)}</span> · funds held in escrow by
          the contract
        </footer>
      </div>
    </div>
  );
}

// ---- presentational helpers ----

function deadlineLabel(
  c: CampaignState | null,
  d: { secondsLeft: number; expired: boolean } | null,
): string {
  if (!c || !d) return "—";
  if (d.expired) return "—";
  const days = Math.floor(d.secondsLeft / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(d.secondsLeft / 3600);
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(0, Math.floor(d.secondsLeft / 60))}m`;
}

function statusText(d: { goalReached: boolean; expired: boolean } | null): string {
  if (!d) return "—";
  if (d.goalReached) return "Funded";
  if (d.expired) return "Ended";
  return "Live";
}

function statusTone(d: { goalReached: boolean; expired: boolean } | null): string {
  if (!d) return "";
  if (d.goalReached) return "tone-good";
  if (d.expired) return "tone-bad";
  return "tone-live";
}

function errorTitle(kind: ErrorKind): string {
  switch (kind) {
    case "wallet-not-found":
      return "Wallet not found.";
    case "rejected":
      return "Rejected.";
    case "insufficient":
      return "Insufficient balance.";
    default:
      return "Error.";
  }
}

function eventIcon(kind: string): string {
  switch (kind) {
    case "contrib":
      return "＋";
    case "reached":
      return "🎉";
    case "withdrawn":
      return "↧";
    case "refund":
      return "↩";
    default:
      return "•";
  }
}

function eventText(e: ActivityEvent): string {
  const amt = e.amount !== null ? `${stroopsToXlm(e.amount).toLocaleString()} XLM` : "";
  switch (e.kind) {
    case "contrib":
      return `${e.from ? shortAddress(e.from) : "Someone"} contributed ${amt}`;
    case "reached":
      return "Goal reached! 🎉";
    case "withdrawn":
      return `Maintainer withdrew ${amt}`;
    case "refund":
      return `${e.from ? shortAddress(e.from) : "Someone"} refunded ${amt}`;
    case "init":
      return "Campaign created";
    default:
      return e.kind;
  }
}
