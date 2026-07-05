"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchDonations, shortAddress, type Donation } from "@/lib/stellar";
import { CREATOR_FULL_NAME, RECEIVING_ADDRESS } from "@/lib/config";

function formatXlm(amount: string): string {
  return Number(amount).toLocaleString(undefined, { maximumFractionDigits: 7 });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Admin() {
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchDonations(RECEIVING_ADDRESS);
      setDonations(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load donations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const total = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const supporters = new Set(donations.map((d) => d.from)).size;

  return (
    <div className="page">
      <div className="hero" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <main className="wrap">
        <div className="topbar">
          <div className="brand">
            <span className="mug" aria-hidden="true">🍵</span>
            <span>Fallow · Admin</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/" className="connect">← Tip page</Link>
            <button className="connect" onClick={logout}>Log out</button>
          </div>
        </div>

        <div className="cards" style={{ gridTemplateColumns: "1fr" }}>
          <section className="card">
            <div className="admin-head">
              <div>
                <h2 className="head" style={{ marginBottom: 4 }}>Donations</h2>
                <p className="bio" style={{ color: "var(--muted)", fontSize: ".9rem" }}>
                  {CREATOR_FULL_NAME} · <span title={RECEIVING_ADDRESS}>{shortAddress(RECEIVING_ADDRESS)}</span>
                </p>
              </div>
              <button className="connect" onClick={load} disabled={loading}>
                {loading ? "Refreshing…" : "↻ Refresh"}
              </button>
            </div>

            <div className="stats">
              <div className="stat">
                <div className="k">Total received</div>
                <div className="v">{formatXlm(String(total))} XLM</div>
              </div>
              <div className="stat">
                <div className="k">Donations</div>
                <div className="v">{donations.length}</div>
              </div>
              <div className="stat">
                <div className="k">Supporters</div>
                <div className="v">{supporters}</div>
              </div>
            </div>

            {error && <div className="notice bad" style={{ marginTop: 18 }}>{error}</div>}

            {loading ? (
              <p className="bio" style={{ color: "var(--muted)", marginTop: 22 }}>Loading donations from Horizon…</p>
            ) : donations.length === 0 && !error ? (
              <div className="empty" style={{ marginTop: 22 }}>
                <span className="heart" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21s-7.5-4.9-10-9.3C.3 8.6 1.7 5 5.1 5c2 0 3.4 1.1 4.4 2.5C10.5 6.1 11.9 5 13.9 5c3.4 0 4.8 3.6 3.1 6.7C16.5 16.1 12 21 12 21z" />
                  </svg>
                </span>
                <p>No tips yet. Once someone buys you a tea, it&apos;ll show up here.</p>
              </div>
            ) : (
              <div className="donations">
                {donations.map((d) => (
                  <div className="donation" key={d.id}>
                    <div className="d-amt">+{formatXlm(d.amount)} XLM</div>
                    <div className="d-main">
                      <div className="d-memo">{d.memo || <span style={{ color: "var(--muted)" }}>(no message)</span>}</div>
                      <div className="d-meta">
                        from <span title={d.from}>{shortAddress(d.from)}</span> · {formatWhen(d.createdAt)}
                      </div>
                    </div>
                    <a
                      className="d-link"
                      href={`https://stellar.expert/explorer/testnet/tx/${d.hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      tx →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
