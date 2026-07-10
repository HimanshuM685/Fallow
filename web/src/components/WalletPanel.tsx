import { useState } from "react";
import type { WalletSummary } from "@tendril/shared";
import { formatXlm } from "@tendril/shared";
import { topUp } from "../wallet";

type SignXdr = (xdr: string) => Promise<string>;

interface Props {
  wallet: WalletSummary | null;
  address: string;
  token: string;
  signXdr: SignXdr;
  onChanged: () => void;
  onError: (msg: string) => void;
}

const PRESETS = [0.5, 1, 5];

/** Prepaid balance + a top-up control + deposit/spend history. */
export function WalletPanel({ wallet, address, token, signXdr, onChanged, onError }: Props) {
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const amountOk = Number.isFinite(amount) && amount > 0;

  async function deposit() {
    if (!amountOk) return;
    setBusy(true);
    try {
      await topUp(token, address, signXdr, amount);
      onChanged();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const balance = wallet?.balanceStroops ?? 0;

  return (
    <section className="wallet-panel">
      <div className="wallet-balance">
        <span className="muted small">Prepaid balance</span>
        <strong className="balance">{formatXlm(balance)}</strong>
      </div>

      <div className="topup">
        {PRESETS.map((p) => (
          <button
            key={p}
            className={`btn ghost${amount === p ? " active" : ""}`}
            onClick={() => setAmount(p)}
          >
            {p} XLM
          </button>
        ))}
        <input
          type="number"
          min={0}
          step={0.1}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="topup-amount"
          aria-label="Top-up amount in XLM"
        />
        <button
          className="btn"
          disabled={busy || !amountOk}
          title={amountOk ? "" : "Enter an amount above 0"}
          onClick={deposit}
        >
          {busy ? "Topping up…" : "Top up"}
        </button>
      </div>

      {wallet && (wallet.topups.length > 0 || wallet.charges.length > 0) && (
        <details className="history">
          <summary className="muted small">History</summary>
          <div className="history-grid">
            <div>
              <span className="muted small">Top-ups</span>
              <ul>
                {wallet.topups.slice(0, 8).map((t) => (
                  <li key={t.txid}>
                    +{formatXlm(t.amountStroops)}{" "}
                    <span className="muted small">{new Date(t.createdAt).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="muted small">Usage</span>
              <ul>
                {wallet.charges.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    −{formatXlm(c.amountStroops)}{" "}
                    <span className="muted small">
                      {c.seconds}s
                      {c.payToAddr && (
                        <> · → {c.payToAddr.slice(0, 6)}…{c.payToAddr.slice(-4)}</>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}
    </section>
  );
}
