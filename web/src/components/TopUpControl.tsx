import { useState } from "react";
import { topUp, type TopUpPhase } from "../wallet";

type SignXdr = (xdr: string) => Promise<string>;

interface Props {
  address: string;
  token: string;
  signXdr: SignXdr;
  onChanged: () => void;
  onError: (msg: string) => void;
  /** Wrapper class — lets callers slot this into different layouts (WalletPanel vs Dashboard). */
  className?: string;
}

const PRESETS = [5, 10, 50, 100];

/** Preset chips + amount + button for calling `topup()` on the ledger contract,
 *  with a two-phase busy state (wallet approval vs on-chain confirmation) and
 *  a brief confirmation toast. No balance/history display — pair it with
 *  whatever already shows those (WalletPanel, Dashboard's stat grid). */
export function TopUpControl({ address, token, signXdr, onChanged, onError, className }: Props) {
  const [amount, setAmount] = useState(5);
  const [phase, setPhase] = useState<TopUpPhase | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const amountOk = Number.isFinite(amount) && amount > 0;
  const busy = phase !== null;

  async function deposit() {
    if (!amountOk) return;
    setConfirmed(null);
    setPhase("signing");
    try {
      await topUp(token, address, signXdr, amount, setPhase);
      onChanged();
      setConfirmed(`+${amount} XLM confirmed`);
      setTimeout(() => setConfirmed(null), 4000);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setPhase(null);
    }
  }

  const buttonLabel =
    phase === "signing" ? "Approve in wallet…" : phase === "confirming" ? "Confirming on-chain…" : "Top up";

  return (
    <div className={`topup${className ? ` ${className}` : ""}`}>
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
        {buttonLabel}
      </button>
      {confirmed && <span className="topup-toast">✓ {confirmed}</span>}
    </div>
  );
}
