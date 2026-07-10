import { useCallback, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "./wallet-context";
import type { WalletSummary } from "@tendril/shared";
import { WalletBar } from "./components/WalletBar";
import { Marketplace } from "./components/Marketplace";
import { HashHero } from "./components/HashHero";
import { Docs } from "./components/Docs";
import { About } from "./components/About";
import { Dashboard } from "./components/Dashboard";
import { loginWithWallet } from "./wallet";
import { fetchWallet, type ActiveLease } from "./api";

export type Session = { token: string; address: string };

// The session token is a 7-day JWT, so persist it and restore on reload — a
// refresh shouldn't force the user to re-sign (and re-sign each time).
const SESSION_KEY = "tendril.session";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s && s.token && s.address ? s : null;
  } catch {
    return null;
  }
}

function storeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode) — session just won't persist */
  }
}

export function App() {
  const { activeAddress, signXdr, isReady } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const [lease, setLease] = useState<ActiveLease | null>(null);
  const [session, setSessionState] = useState<Session | null>(loadSession);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep localStorage in lockstep with the session so reloads stay signed in.
  const setSession = useCallback((s: Session | null) => {
    storeSession(s);
    setSessionState(s);
    if (!s) setWallet(null);
  }, []);

  const path = location.pathname;
  const isLanding = path === "/";
  const inApp = path === "/explore" || path === "/contribute";

  // Keep the tab title in step with the route so multiple tabs are tellable apart.
  useEffect(() => {
    const titles: Record<string, string> = {
      "/explore": "EXPLORE",
      "/contribute": "CONTRIBUTE",
      "/dashboard": "DASHBOARD",
      "/docs": "DOCS",
      "/about": "ABOUT",
    };
    const page = titles[path];
    document.title = page ? `TENDRIL — ${page}` : "TENDRIL";
  }, [path]);

  // Drop the session only on a real disconnect / account switch — and only once
  // the wallet has finished resuming, so a transient reconnect on reload (when
  // activeAddress is briefly null) doesn't wrongly clear a valid session.
  useEffect(() => {
    if (!isReady) return;
    if (!activeAddress || (session && session.address !== activeAddress)) {
      setSession(null);
    }
  }, [isReady, activeAddress, session, setSession]);

  const refreshWallet = useCallback(
    async (token: string) => {
      try {
        setWallet(await fetchWallet(token));
      } catch (e) {
        // A 401 means the stored token expired/was revoked — clear it so the UI
        // falls back to a fresh sign-in instead of polling forever.
        if (/\b401\b/.test((e as Error).message)) setSession(null);
        /* other errors are transient — keep the session */
      }
    },
    [setSession],
  );

  // While signed in, poll the balance so it visibly drains as compute is metered.
  // Pause polling while the tab is hidden (no point hammering the backend in a
  // background tab) and do an immediate refresh when it becomes visible again.
  useEffect(() => {
    if (!session) return;
    const { token } = session;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      if (timer) return;
      refreshWallet(token);
      timer = setInterval(() => refreshWallet(token), 5000);
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session, refreshWallet]);

  async function signIn() {
    if (!activeAddress) return;
    setSigningIn(true);
    setError(null);
    try {
      const res = await loginWithWallet(activeAddress, signXdr);
      setSession({ token: res.token, address: res.address });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSigningIn(false);
    }
  }

  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");
  const onWalletChanged = () => session && refreshWallet(session.token);

  return (
    <div className="app">
      <div className="scanlines" aria-hidden="true"></div>

      <header className="masthead">
        <nav className="mast-left">
          {inApp ? (
            <>
              <NavLink to="/explore" className={navClass}>
                EXPLORE
              </NavLink>
              <NavLink to="/contribute" className={navClass}>
                CONTRIBUTE
              </NavLink>
            </>
          ) : (
            !isLanding && (
              <NavLink to="/explore" className={navClass}>
                EXPLORE&nbsp;→
              </NavLink>
            )
          )}
          <NavLink to="/dashboard" className={navClass}>
            DASHBOARD
          </NavLink>
          <NavLink to="/docs" className={navClass}>
            DOCS
          </NavLink>
          <NavLink to="/about" className={navClass}>
            ABOUT
          </NavLink>
        </nav>
        <span className="wordmark" onClick={() => navigate("/")} role="button" tabIndex={0}>
          TENDRIL<span className="wm-tld">.XLM</span>
        </span>
        <div className="mast-right">
          {!isLanding && (
            <WalletBar
              signedIn={!!session}
              canSignIn={!!activeAddress}
              signingIn={signingIn}
              onSignIn={signIn}
            />
          )}
        </div>
      </header>

      <div className="rule rule-heavy"></div>

      <main>
        {error && (
          <div className="error">
            <span>{error}</span>
            <button
              className="error-dismiss"
              aria-label="Dismiss error"
              onClick={() => setError(null)}
            >
              ×
            </button>
          </div>
        )}

        <Routes>
          <Route
            path="/"
            element={
              <HashHero
                onEnter={() => navigate("/explore")}
                onDocs={() => navigate("/docs")}
                onAbout={() => navigate("/about")}
              />
            }
          />
          <Route
            path="/explore"
            element={
              <Marketplace
                tab="explore"
                session={session}
                wallet={wallet}
                activeAddress={activeAddress ?? null}
                signXdr={signXdr}
                onWalletChanged={onWalletChanged}
                onError={setError}
                lease={lease}
                onLeased={setLease}
              />
            }
          />
          <Route
            path="/contribute"
            element={
              <Marketplace
                tab="contribute"
                session={session}
                wallet={wallet}
                activeAddress={activeAddress ?? null}
                signXdr={signXdr}
                onWalletChanged={onWalletChanged}
                onError={setError}
                lease={lease}
                onLeased={setLease}
              />
            }
          />
          <Route
            path="/dashboard"
            element={
              <Dashboard wallet={wallet} address={session?.address ?? null} signedIn={!!session} />
            }
          />
          <Route path="/docs" element={<Docs />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <div className="rule rule-heavy"></div>

      <footer className="footer">
        <span>&copy;&nbsp;TENDRIL</span>
        <span className="foot-mid">
          EPHEMERAL DOCKER SANDBOX &bull; NO HOST MOUNT &bull; DESTROYED ON LEASE END
        </span>
        <span>STELLAR&nbsp;TESTNET</span>
      </footer>
    </div>
  );
}
