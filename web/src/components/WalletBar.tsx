import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { WalletSummary } from "@fallow/shared";
import { formatXlm } from "@fallow/shared";
import { useWallet } from "../wallet-context";
import { writeClipboard } from "../clipboard";
import { TopUpControl } from "./TopUpControl";

interface Props {
  signedIn: boolean;
  canSignIn: boolean;
  signingIn: boolean;
  onSignIn: () => void;
  wallet: WalletSummary | null;
  token: string | null;
  onWalletChanged: () => void;
  onError: (msg: string) => void;
}

/**
 * One "Connect Wallet" button → the StellarWalletsKit picker modal (Freighter /
 * xBull / Albedo / …) → on connect, sign-in fires automatically so the prepaid
 * balance loads in a single flow. Once connected, the address chip is always a
 * dropdown: balance and a top-up control once signed in, plus copy address,
 * a link to full history, and disconnect.
 */
export function WalletBar({
  signedIn,
  canSignIn,
  signingIn,
  onSignIn,
  wallet,
  token,
  onWalletChanged,
  onError,
}: Props) {
  const { activeAddress, signXdr, connect, disconnect } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Only auto sign-in after a user-initiated connect (not on reload reconnect).
  const autoSignIn = useRef(false);

  useEffect(() => {
    if (activeAddress && autoSignIn.current && !signedIn && canSignIn && !signingIn) {
      autoSignIn.current = false;
      onSignIn();
    }
  }, [activeAddress, signedIn, canSignIn, signingIn, onSignIn]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function onConnect() {
    autoSignIn.current = true;
    setConnecting(true);
    try {
      await connect();
    } catch {
      autoSignIn.current = false;
    } finally {
      setConnecting(false);
    }
  }

  function copyAddress() {
    if (!activeAddress) return;
    void writeClipboard(activeAddress).then((ok) => {
      if (!ok) return; // don't claim "Copied!" if the copy actually failed
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (activeAddress) {
    const short = `${activeAddress.slice(0, 6)}…${activeAddress.slice(-4)}`;

    return (
      <div className="wallet-bar" ref={menuRef}>
        {/* Sign-in stays a visible button, not a dropdown item — it's the one
            thing you must do next, and burying it hides the whole flow. */}
        {!signedIn && (
          <button className="btn" disabled={!canSignIn || signingIn} onClick={onSignIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        )}
        <div className="addr-menu">
          <button
            className="addr"
            title={activeAddress}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-haspopup="true"
          >
            {short}
          </button>
          {open && (
            <div className="addr-dropdown">
              {signedIn && token ? (
                <>
                  <div className="addr-dropdown-balance">
                    <span className="muted small">Balance</span>
                    <strong className="balance">{formatXlm(wallet?.balanceStroops ?? 0)}</strong>
                  </div>

                  <TopUpControl
                    address={activeAddress}
                    token={token}
                    signXdr={signXdr}
                    onChanged={onWalletChanged}
                    onError={onError}
                  />
                </>
              ) : (
                // No session yet, so there's no balance to read and no top-up to sign.
                <div className="addr-dropdown-balance">
                  <span className="muted small">Not signed in</span>
                </div>
              )}

              <div className="addr-dropdown-links">
                <button className="addr-dropdown-link" onClick={copyAddress}>
                  {copied ? "Copied!" : "Copy address"}
                </button>
                {signedIn && (
                  <Link to="/dashboard" className="addr-dropdown-link" onClick={() => setOpen(false)}>
                    History
                  </Link>
                )}
                <button
                  className="addr-dropdown-link"
                  onClick={() => {
                    setOpen(false);
                    disconnect();
                  }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-bar">
      <button className="btn" disabled={connecting} onClick={onConnect}>
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    </div>
  );
}
