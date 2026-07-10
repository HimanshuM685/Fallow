import { useEffect, useRef, useState } from "react";
import { useWallet } from "../wallet-context";

interface Props {
  signedIn: boolean;
  canSignIn: boolean;
  signingIn: boolean;
  onSignIn: () => void;
}

/**
 * One "Connect Wallet" button → the StellarWalletsKit picker modal (Freighter /
 * xBull / Albedo / …) → on connect, sign-in fires automatically so the prepaid
 * balance loads in a single flow.
 */
export function WalletBar({ signedIn, canSignIn, signingIn, onSignIn }: Props) {
  const { activeAddress, connect, disconnect } = useWallet();
  const [connecting, setConnecting] = useState(false);
  // Only auto sign-in after a user-initiated connect (not on reload reconnect).
  const autoSignIn = useRef(false);

  useEffect(() => {
    if (activeAddress && autoSignIn.current && !signedIn && canSignIn && !signingIn) {
      autoSignIn.current = false;
      onSignIn();
    }
  }, [activeAddress, signedIn, canSignIn, signingIn, onSignIn]);

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

  if (activeAddress) {
    return (
      <div className="wallet-bar">
        <span className="addr" title={activeAddress}>
          {activeAddress.slice(0, 6)}…{activeAddress.slice(-4)}
        </span>
        {!signedIn && (
          <button className="btn" disabled={!canSignIn || signingIn} onClick={onSignIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        )}
        <button className="btn ghost" onClick={() => disconnect()}>
          Disconnect
        </button>
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
