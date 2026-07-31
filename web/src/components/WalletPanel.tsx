import type { WalletSummary } from "@fallow/shared";
import { formatXlm, formatXlmShort } from "@fallow/shared";
import { TopUpControl } from "./TopUpControl";

type SignXdr = (xdr: string) => Promise<string>;

interface Props {
  wallet: WalletSummary | null;
  address: string;
  token: string;
  signXdr: SignXdr;
  onChanged: () => void;
  onError: (msg: string) => void;
}

/** Prepaid balance + a top-up control + deposit/spend history. */
export function WalletPanel({ wallet, address, token, signXdr, onChanged, onError }: Props) {
  const balance = wallet?.balanceStroops ?? 0;

  return (
    <section className="wallet-panel">
      <div className="wallet-balance">
        <span className="muted small">Prepaid balance</span>
        <strong className="balance" title={formatXlm(balance)}>{formatXlmShort(balance)}</strong>
      </div>

      <TopUpControl address={address} token={token} signXdr={signXdr} onChanged={onChanged} onError={onError} />

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
