"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APP, CONTRACT_ID, EXPLORER_CONTRACT, EXPLORER_TX } from "@/lib/config";
import {
  type ActivityEvent,
  type Campaign,
  type ErrorKind,
  type SignFn,
  type TxPhase,
  contribute,
  createCampaign,
  describeError,
  formatXlm,
  fundWithFriendbot,
  getCampaigns,
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

const PHASE_LABEL: Record<TxPhase, string> = {
  building: "Building…",
  signing: "Confirm in wallet…",
  pending: "Submitting…",
  success: "Confirmed",
  error: "Failed",
};

export default function App() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const walletRef = useRef<Wallet | null>(null);
  walletRef.current = wallet;

  const refreshCampaigns = useCallback(async () => {
    try {
      const list = await getCampaigns();
      list.sort((a, b) => b.id - a.id); // newest first
      setCampaigns(list);
    } catch {
      /* transient RPC hiccup */
    } finally {
      setLoaded(true);
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

  const refreshBalance = useCallback(async (address: string) => {
    try {
      setBalance(await getXlmBalance(address));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshCampaigns();
    refreshEvents();
    restoreWallet().then((w) => {
      if (w) {
        setWallet(w);
        refreshBalance(w.address);
      }
    });
  }, [refreshCampaigns, refreshEvents, refreshBalance]);

  // Real-time: Soroban RPC has no push, so poll state + events every 5s.
  useEffect(() => {
    const t = setInterval(() => {
      refreshCampaigns();
      refreshEvents();
      const w = walletRef.current;
      if (w) refreshBalance(w.address);
    }, 5000);
    return () => clearInterval(t);
  }, [refreshCampaigns, refreshEvents, refreshBalance]);

  const sign: SignFn = useCallback(
    (xdr: string) => signWithWallet(xdr, walletRef.current!.address),
    [],
  );

  const afterAction = useCallback(async () => {
    await Promise.all([refreshCampaigns(), refreshEvents()]);
    const w = walletRef.current;
    if (w) refreshBalance(w.address);
  }, [refreshCampaigns, refreshEvents, refreshBalance]);

  async function handleConnect() {
    setTopError(null);
    setConnecting(true);
    try {
      const w = await connectWallet();
      setWallet(w);
      await refreshBalance(w.address);
    } catch (err) {
      setTopError(describeError(err).message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectWallet();
    setWallet(null);
    setBalance(null);
    setShowCreate(false);
  }

  async function handleFriendbot() {
    if (!wallet) return;
    setFunding(true);
    setTopError(null);
    try {
      await fundWithFriendbot(wallet.address);
      await refreshBalance(wallet.address);
    } catch (err) {
      setTopError(describeError(err).message);
    } finally {
      setFunding(false);
    }
  }

  const titleById = useMemo(() => {
    const m = new Map<number, string>();
    campaigns.forEach((c) => m.set(c.id, c.title));
    return m;
  }, [campaigns]);

  return (
    <div className="page">
      <div className="hero" />
      <div className="grain" />
      <div className="wrap">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">◎</span>
            <span className="brand-name">{APP.name}</span>
          </div>
          {wallet ? (
            <div className="wallet-chip">
              <span className="dot" />
              <span className="mono">{shortAddress(wallet.address)}</span>
              {balance !== null && <span className="chip-bal">· {formatXlm(balance)} XLM</span>}
              <button className="chip-btn" onClick={handleFriendbot} disabled={funding}>
                {funding ? "Funding…" : "Fund"}
              </button>
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

        <section className="masthead">
          <h1 className="masthead-title">Crowdfund anything on Stellar</h1>
          <p className="masthead-tagline">{APP.tagline}</p>
          <div className="masthead-actions">
            {wallet ? (
              <button className="btn-primary inline" onClick={() => setShowCreate((s) => !s)}>
                {showCreate ? "Close" : "＋ Start a campaign"}
              </button>
            ) : (
              <button className="btn-primary inline" onClick={handleConnect} disabled={connecting}>
                Connect a wallet to start
              </button>
            )}
            <a className="contract-link mono" href={EXPLORER_CONTRACT(CONTRACT_ID)} target="_blank" rel="noreferrer">
              Contract {shortAddress(CONTRACT_ID)} ↗
            </a>
          </div>
          {topError && <div className="banner bad top">{topError}</div>}
        </section>

        {wallet && showCreate && (
          <CreateCampaign
            address={wallet.address}
            sign={sign}
            onCreated={async () => {
              setShowCreate(false);
              await afterAction();
            }}
          />
        )}

        <main className="layout-2">
          <section>
            <h2 className="section-title">
              {campaigns.length > 0 ? `Campaigns (${campaigns.length})` : "Campaigns"}
            </h2>
            {!loaded ? (
              <div className="card empty">Loading campaigns…</div>
            ) : campaigns.length === 0 ? (
              <div className="card empty">
                <strong>No campaigns yet.</strong>
                <span>
                  {wallet
                    ? "Start the first one — you'll be its owner and can withdraw once it's funded."
                    : "Connect a wallet to create the first campaign."}
                </span>
              </div>
            ) : (
              <div className="campaign-grid">
                {campaigns.map((c) => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    wallet={wallet}
                    balance={balance}
                    sign={sign}
                    onChanged={afterAction}
                  />
                ))}
              </div>
            )}
          </section>

          <aside>
            <div className="card activity">
              <h2 className="widget-title">
                Live activity <span className="live-dot" />
              </h2>
              {events.length === 0 ? (
                <p className="widget-hint">No on-chain activity yet.</p>
              ) : (
                <ul className="activity-list">
                  {events.slice(0, 10).map((e) => (
                    <li key={e.id} className="activity-row">
                      <span className="act-icon">{eventIcon(e.kind)}</span>
                      <span className="act-text">{eventText(e, titleById)}</span>
                      <a className="act-link" href={EXPLORER_TX(e.txHash)} target="_blank" rel="noreferrer">
                        ↗
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </main>

        <footer className="foot">
          Runs on the <strong>Stellar testnet</strong> · no admin — every campaign is owned by its
          creator · funds escrowed by the contract
        </footer>
      </div>
    </div>
  );
}

// ---------------- create campaign ----------------

function CreateCampaign({
  address,
  sign,
  onCreated,
}: {
  address: string;
  sign: SignFn;
  onCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState(String(APP.defaultDurationDays));
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== null && phase !== "success" && phase !== "error";

  async function submit() {
    setError(null);
    const g = Number.parseFloat(goal);
    const d = Number.parseInt(days, 10);
    if (!title.trim()) return setError("Give your campaign a title.");
    if (!Number.isFinite(g) || g <= 0) return setError("Enter a goal greater than 0.");
    if (!Number.isFinite(d) || d <= 0) return setError("Enter a duration in days.");
    const deadline = Math.floor(Date.now() / 1000) + d * 86400;
    setPhase("building");
    try {
      await createCampaign(title.trim().slice(0, APP.titleMaxLength), xlmToStroops(g), deadline, {
        address,
        sign,
        onPhase: setPhase,
      });
      setTitle("");
      setGoal("");
      await onCreated();
    } catch (err) {
      setPhase("error");
      setError(describeError(err).message);
    } finally {
      setPhase(null);
    }
  }

  return (
    <div className="card create-panel">
      <h2 className="widget-title">Start a campaign</h2>
      <label className="field">
        <span className="field-label">Title</span>
        <input
          type="text"
          maxLength={APP.titleMaxLength}
          placeholder="e.g. Fund my open-source library"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="field-label">Goal (XLM)</span>
          <input
            type="number"
            min="1"
            placeholder="1000"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="field">
          <span className="field-label">Duration (days)</span>
          <input
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={busy}
          />
        </label>
      </div>
      <button className="btn-primary" onClick={submit} disabled={busy}>
        {busy && phase ? PHASE_LABEL[phase] : "Create campaign"}
      </button>
      {error && <div className="banner bad">{error}</div>}
      <p className="widget-hint create-note">
        You&apos;ll sign one transaction. You become the campaign owner and can withdraw the
        escrowed funds once the goal is reached.
      </p>
    </div>
  );
}

// ---------------- one campaign ----------------

function CampaignCard({
  campaign,
  wallet,
  balance,
  sign,
  onChanged,
}: {
  campaign: Campaign;
  wallet: Wallet | null;
  balance: bigint | null;
  sign: SignFn;
  onChanged: () => void | Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [action, setAction] = useState<"contribute" | "withdraw" | "refund" | null>(null);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [error, setError] = useState<{ kind: ErrorKind; message: string } | null>(null);
  const [success, setSuccess] = useState<{ hash: string; label: string } | null>(null);
  const [mine, setMine] = useState<bigint>(0n);

  useEffect(() => {
    let active = true;
    if (wallet) {
      getContribution(campaign.id, wallet.address)
        .then((v) => active && setMine(v))
        .catch(() => {});
    } else {
      setMine(0n);
    }
    return () => {
      active = false;
    };
  }, [wallet, campaign.id, campaign.raisedStroops]);

  const d = useMemo(() => {
    const goal = campaign.goalStroops;
    const raised = campaign.raisedStroops;
    const pct = goal > 0n ? Math.min(100, Number((raised * 10000n) / goal) / 100) : 0;
    const now = Math.floor(Date.now() / 1000);
    return {
      pct,
      expired: now > campaign.deadline,
      goalReached: raised >= goal,
      secondsLeft: campaign.deadline - now,
    };
  }, [campaign]);

  const isCreator = !!wallet && wallet.address === campaign.creator;
  const canContribute = !!wallet && !d.expired && !campaign.withdrawn;
  const canWithdraw = isCreator && d.goalReached && !campaign.withdrawn;
  const canRefund = !!wallet && d.expired && !d.goalReached && mine > 0n && !campaign.withdrawn;
  const busy = action !== null;

  async function run(
    kind: "contribute" | "withdraw" | "refund",
    fn: () => Promise<{ hash: string }>,
    label: string,
  ) {
    setError(null);
    setSuccess(null);
    setAction(kind);
    setPhase("building");
    try {
      const { hash } = await fn();
      setSuccess({ hash, label });
      setAmount("");
      await onChanged();
    } catch (err) {
      setPhase("error");
      setError(describeError(err));
    } finally {
      setAction(null);
      setPhase(null);
    }
  }

  function doContribute() {
    if (!wallet) return;
    const xlm = Number.parseFloat(amount);
    if (!Number.isFinite(xlm) || xlm <= 0) {
      setError({ kind: "unknown", message: "Enter an amount greater than 0." });
      return;
    }
    const stroops = xlmToStroops(xlm);
    if (balance !== null && stroops > balance - xlmToStroops(1.5)) {
      setError({ kind: "insufficient", message: "Insufficient XLM (leave ~1.5 for fees/reserves)." });
      return;
    }
    run("contribute", () => contribute(campaign.id, stroops, { address: wallet.address, sign, onPhase: setPhase }), `Contributed ${xlm} XLM`);
  }

  return (
    <div className="ccard">
      <div className="ccard-head">
        <h3 className="ccard-title">{campaign.title}</h3>
        {campaign.withdrawn ? (
          <span className="tag done">Withdrawn</span>
        ) : d.goalReached ? (
          <span className="tag good">Funded</span>
        ) : d.expired ? (
          <span className="tag bad">Ended</span>
        ) : (
          <span className="tag live">Live</span>
        )}
      </div>
      <div className="ccard-meta">
        by <span className="mono">{shortAddress(campaign.creator)}</span>
        {isCreator && <span className="you">you</span>}
      </div>

      <div className="ccard-nums">
        <span>
          <strong>{formatXlm(campaign.raisedStroops)}</strong> / {formatXlm(campaign.goalStroops, 0)} XLM
        </span>
        <span className="pct">{Math.round(d.pct)}%</span>
      </div>
      <div className="progress">
        <div className={`progress-bar${d.goalReached ? " done" : ""}`} style={{ width: `${d.pct}%` }} />
      </div>
      <div className="ccard-sub">
        {d.expired ? "Ended" : `${timeLeft(d.secondsLeft)} left`}
        {mine > 0n && <span> · you backed {formatXlm(mine)} XLM</span>}
      </div>

      {canContribute && (
        <div className="ccard-contribute">
          <div className="presets sm">
            {APP.contributePresets.map((p) => (
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
              inputMode="decimal"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
            <span className="unit">XLM</span>
          </div>
          <button className="btn-primary sm" onClick={doContribute} disabled={busy}>
            {action === "contribute" && phase ? PHASE_LABEL[phase] : "Contribute"}
          </button>
        </div>
      )}

      {(canWithdraw || canRefund) && (
        <div className="ccard-actions">
          {canWithdraw && (
            <button className="btn-ghost sm" onClick={() => run("withdraw", () => withdraw(campaign.id, { address: wallet!.address, sign, onPhase: setPhase }), "Withdrew funds")} disabled={busy}>
              {action === "withdraw" && phase ? PHASE_LABEL[phase] : "Withdraw funds"}
            </button>
          )}
          {canRefund && (
            <button className="btn-ghost sm" onClick={() => run("refund", () => refund(campaign.id, { address: wallet!.address, sign, onPhase: setPhase }), "Refunded")} disabled={busy}>
              {action === "refund" && phase ? PHASE_LABEL[phase] : `Refund ${formatXlm(mine)} XLM`}
            </button>
          )}
        </div>
      )}

      {busy && phase && phase !== "success" && (
        <div className="status pending sm">
          <span className="spinner" />
          {PHASE_LABEL[phase]}
        </div>
      )}
      {success && (
        <div className="banner good sm">
          {success.label}.{" "}
          <a href={EXPLORER_TX(success.hash)} target="_blank" rel="noreferrer">
            View ↗
          </a>
        </div>
      )}
      {error && (
        <div className="banner bad sm">
          <strong>{errorTitle(error.kind)}</strong> {error.message}
        </div>
      )}
    </div>
  );
}

// ---------------- helpers ----------------

function timeLeft(seconds: number): string {
  if (seconds <= 0) return "0m";
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(1, Math.floor(seconds / 60))}m`;
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
    case "created":
      return "✦";
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

function eventText(e: ActivityEvent, titles: Map<number, string>): string {
  const title = e.campaignId !== null ? titles.get(e.campaignId) : undefined;
  const name = title ? `"${title}"` : e.campaignId !== null ? `#${e.campaignId}` : "";
  const amt = e.amount !== null ? `${stroopsToXlm(e.amount).toLocaleString()} XLM` : "";
  switch (e.kind) {
    case "created":
      return `New campaign ${name}`;
    case "contrib":
      return `${e.from ? shortAddress(e.from) : "Someone"} backed ${name} with ${amt}`;
    case "reached":
      return `${name} reached its goal! 🎉`;
    case "withdrawn":
      return `${name} withdrew ${amt}`;
    case "refund":
      return `${e.from ? shortAddress(e.from) : "Someone"} refunded ${amt} from ${name}`;
    default:
      return e.kind;
  }
}
