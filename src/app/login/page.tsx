"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Login failed");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <Link href="/" className="connect">← Tip page</Link>
        </div>

        <div className="cards" style={{ gridTemplateColumns: "minmax(0, 460px)", justifyContent: "center" }}>
          <section className="card">
            <h2 className="head">
              Admin login
              <button className="help" aria-label="About admin" title="Enter the admin password to view donations.">?</button>
            </h2>
            <p className="bio" style={{ color: "var(--muted)", marginBottom: 18 }}>
              This dashboard is private. Enter the password to see who bought Himanshu a tea.
            </p>

            <form className="fields" onSubmit={submit}>
              <input
                className="field"
                type="password"
                placeholder="Admin password"
                aria-label="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
              <button className="support" type="submit" disabled={submitting} style={{ marginTop: 6 }}>
                {submitting ? "Checking…" : "Unlock dashboard"}
              </button>
            </form>

            {error && <div className="notice bad" style={{ marginTop: 14 }}>{error}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
