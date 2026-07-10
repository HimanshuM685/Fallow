import { useEffect, useState } from "react";
import type { LeaseStatus } from "@tendril/shared";
import { type ActiveLease, fetchLease, releaseLease } from "../api";
import { writeClipboard } from "../clipboard";

interface Props {
  lease: ActiveLease;
  onRelease: () => void;
}

/** mm:ss under an hour, h:mm:ss above — a long balance shouldn't read "125:33". */
function fmtCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function LeasePanel({ lease, onRelease }: Props) {
  const [now, setNow] = useState(Date.now());
  const [expiresAt, setExpiresAt] = useState(lease.expiresAt);
  const [status, setStatus] = useState<LeaseStatus>("active");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ended = status === "ended" || status === "failed";

  // Tick the clock locally for a smooth countdown.
  useEffect(() => {
    if (ended) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ended]);

  // Poll the server so projected "time left" tracks the balance, and we notice
  // when the wallet runs dry (status flips to "ended"). Stops once the lease is
  // over and pauses while the tab is hidden.
  useEffect(() => {
    if (ended) return;
    let alive = true;
    const poll = () =>
      fetchLease(lease.leaseId, lease.leaseToken)
        .then((l) => {
          if (!alive) return;
          setExpiresAt(l.expiresAt);
          setStatus(l.status);
        })
        .catch(() => {});
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (timer) return;
      poll();
      timer = setInterval(poll, 4000);
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [lease.leaseId, lease.leaseToken, ended]);

  const remainingMs = Math.max(0, expiresAt - now);

  function copy(label: string, value: string) {
    void writeClipboard(value).then((ok) => {
      if (!ok) return; // don't claim "Copied!" if the copy actually failed
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    });
  }

  async function release() {
    setBusy(true);
    setError(null);
    try {
      await releaseLease(lease.leaseId, lease.leaseToken);
      onRelease();
    } catch (e) {
      // Keep the panel open — the sandbox may still be live and billing.
      setError(`Release failed — ${(e as Error).message}. Try again.`);
    } finally {
      setBusy(false);
    }
  }

  const { command, password } = lease.access;

  return (
    <div className="lease-panel">
      <div className="lease-head">
        <div>
          <strong>Active session</strong> on <code>{lease.label}</code>
          <div className="muted small">
            lease {lease.leaseId} · {(lease.rateStroopsPerHour / 1e7).toFixed(4)} XLM/hr
          </div>
        </div>
        <div className="timer" data-expiring={remainingMs < 60_000} title="time left at current balance">
          {fmtCountdown(remainingMs)}
        </div>
        <div className="lease-actions">
          <button className="btn ghost" disabled={busy || ended} onClick={release}>
            {busy ? "Releasing…" : "Release"}
          </button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {!ended ? (
        <div className="ssh-access">
          <p className="muted small">Connect over SSH — your wallet address is the password:</p>
          <div className="ssh-row">
            <code className="ssh-code">{command}</code>
            <button className="btn ghost" onClick={() => copy("cmd", command)}>
              {copied === "cmd" ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="ssh-row">
            <span className="muted small">password</span>
            <code className="ssh-code">{password}</code>
            <button className="btn ghost" onClick={() => copy("pw", password)}>
              {copied === "pw" ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="muted small">
            Billed by the hour, prorated — you're charged for the exact time used when you release.
          </p>
        </div>
      ) : (
        <div className="ssh-access">
          <p className="muted">
            Lease ended — your balance ran out or you released it, and the sandbox was destroyed.
          </p>
          <button className="btn ghost" onClick={onRelease}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
