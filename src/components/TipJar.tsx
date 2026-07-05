"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
} from "@stellar/freighter-api";
import {
  describeHorizonError,
  fetchXlmBalance,
  fundWithFriendbot,
  sendXlmPayment,
  shortAddress,
  toMemoText,
} from "@/lib/stellar";
import {
  CREATOR_BIO,
  CREATOR_FULL_NAME,
  CREATOR_HANDLE,
  CREATOR_NAME,
  PRESETS,
  RECEIVING_ADDRESS,
  XLM_PER_TEA,
} from "@/lib/config";

type TxState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; hash: string }
  | { status: "error"; message: string };

interface Supporter {
  name: string;
  message: string;
  amount: number;
}

const initials = CREATOR_FULL_NAME.split(" ")
  .map((w) => w[0])
  .join("")
  .slice(0, 2)
  .toUpperCase();

export default function TipJar() {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [unfunded, setUnfunded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [funding, setFunding] = useState(false);

  const [amount, setAmount] = useState(PRESETS[0]);
  const [isCustom, setIsCustom] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [tx, setTx] = useState<TxState>({ status: "idle" });
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const bal = await fetchXlmBalance(addr);
      if (bal === null) {
        setUnfunded(true);
        setBalance(null);
      } else {
        setUnfunded(false);
        setBalance(bal);
      }
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const connected = await isConnected();
      if (connected.isConnected) {
        const addr = await getAddress();
        if (addr.address) setAddress(addr.address);
      }
    })();
  }, []);

  useEffect(() => {
    if (!address) return;
    (async () => {
      const details = await getNetworkDetails();
      if (!details.error) setNetwork(details.network);
      await refreshBalance(address);
    })();
  }, [address, refreshBalance]);

  const connect = async () => {
    setConnecting(true);
    try {
      const connected = await isConnected();
      if (!connected.isConnected) {
        setTx({
          status: "error",
          message:
            "Freighter isn't installed. Get it at freighter.app, then switch it to Testnet.",
        });
        return;
      }
      const access = await requestAccess();
      if (access.error) {
        setTx({ status: "error", message: access.error.message ?? "Connection denied" });
        return;
      }
      setAddress(access.address);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setNetwork(null);
    setBalance(null);
    setUnfunded(false);
    setTx({ status: "idle" });
  };

  const fund = async () => {
    if (!address) return;
    setFunding(true);
    try {
      await fundWithFriendbot(address);
      await refreshBalance(address);
    } catch (err) {
      setTx({
        status: "error",
        message: err instanceof Error ? err.message : "Friendbot funding failed",
      });
    } finally {
      setFunding(false);
    }
  };

  const onTestnet = network === null || network === "TESTNET";
  const sending = tx.status === "submitting";

  const pickPreset = (a: number) => {
    setAmount(a);
    setIsCustom(false);
    setCustomVal("");
  };

  const onCustom = (v: string) => {
    setCustomVal(v);
    const n = parseInt(v, 10);
    if (v === "" || isNaN(n)) {
      setIsCustom(false);
      setAmount(PRESETS[0]);
    } else {
      setIsCustom(true);
      setAmount(Math.min(9999, Math.max(1, n)));
    }
  };

  const support = async () => {
    if (!address) {
      await connect();
      return;
    }
    // Name + message go on-chain as the memo (28-byte Stellar limit).
    const combined = [name.trim(), message.trim()].filter(Boolean).join(" · ") || "tea tip";
    const memo = toMemoText(combined);

    setTx({ status: "submitting" });
    try {
      const result = await sendXlmPayment({
        source: address,
        destination: RECEIVING_ADDRESS,
        amount: String(amount),
        memo,
      });
      setTx({ status: "success", hash: result.hash });
      setSupporters((prev) => [
        { name: name.trim() || "Anonymous", message: message.trim(), amount },
        ...prev,
      ]);
      setName("");
      setMessage("");
      await refreshBalance(address);
    } catch (err) {
      setTx({ status: "error", message: describeHorizonError(err) });
    }
  };

  const supportLabel = !address
    ? connecting
      ? "Connecting…"
      : "Connect Freighter"
    : sending
      ? "Sending…"
      : `Support ${amount} XLM`;

  return (
    <div className="page">
      <div className="hero" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <main className="wrap">
        <div className="topbar">
          <div className="brand">
            <span className="mug" aria-hidden="true">🍵</span>
            <span>Fallow</span>
          </div>

          {address ? (
            <div className="wallet">
              <span className="dot" aria-hidden="true" />
              <span className="addr" title={address}>{shortAddress(address)}</span>
              {balance !== null && (
                <span className="bal">· {Number(balance).toFixed(2)} XLM</span>
              )}
              <button className="disconnect" onClick={disconnect}>Disconnect</button>
            </div>
          ) : (
            <button className="connect" onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect Freighter"}
            </button>
          )}
        </div>

        <div className="cards">
          {/* ============ PROFILE CARD ============ */}
          <section className="card profile" aria-labelledby="about-h">
            <div className="profile-top">
              <div className="avatar mono" role="img" aria-label={CREATOR_FULL_NAME}>
                {initials}
              </div>
              <div className="who">
                <span className="name">{CREATOR_FULL_NAME}</span>
                <span className="handle">{CREATOR_HANDLE}</span>
              </div>
              <Link href="/admin" className="edit">Admin</Link>
            </div>

            <h2 className="head" id="about-h">
              About {CREATOR_NAME}
              <button className="help" aria-label="What is this?" title="A short intro your supporters see first.">?</button>
            </h2>
            <p className="bio">{CREATOR_BIO}</p>

            <hr className="divider" />

            <h3 className="head">
              Recent supporters
              <button className="help" aria-label="About supporters" title="People who buy you a tea show up here.">?</button>
            </h3>

            {supporters.length === 0 ? (
              <div className="empty">
                <span className="heart" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21s-7.5-4.9-10-9.3C.3 8.6 1.7 5 5.1 5c2 0 3.4 1.1 4.4 2.5C10.5 6.1 11.9 5 13.9 5c3.4 0 4.8 3.6 3.1 6.7C16.5 16.1 12 21 12 21z" />
                  </svg>
                </span>
                <p>
                  Be the first to support <strong>{CREATOR_NAME}</strong> and leave a note they&apos;ll never forget.
                </p>
              </div>
            ) : (
              <div className="fields">
                {supporters.map((s, i) => (
                  <div className="supporter" key={i}>
                    <svg className="s-heart" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21s-7.5-4.9-10-9.3C.3 8.6 1.7 5 5.1 5c2 0 3.4 1.1 4.4 2.5C10.5 6.1 11.9 5 13.9 5c3.4 0 4.8 3.6 3.1 6.7C16.5 16.1 12 21 12 21z" />
                    </svg>
                    <div>
                      <div className="s-name">{s.name} sent {s.amount} XLM</div>
                      {s.message && <div className="s-msg">&quot;{s.message}&quot;</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ============ PAYMENT WIDGET CARD ============ */}
          <section className="card widget" aria-labelledby="buy-h">
            <h2 className="head" id="buy-h">
              Buy {CREATOR_NAME} some Tea
              <button className="help" aria-label="How it works" title={`Each tea is ${XLM_PER_TEA} XLM on testnet. Pick an amount, or set your own.`}>?</button>
            </h2>

            <div className="selector" role="radiogroup" aria-label="Tip amount in XLM">
              <span className="coffee" aria-hidden="true">🍵</span>
              <span className="times" aria-hidden="true">×</span>
              {PRESETS.map((a) => (
                <button
                  key={a}
                  className={`num${!isCustom && amount === a ? " is-active" : ""}`}
                  role="radio"
                  aria-checked={!isCustom && amount === a}
                  onClick={() => pickPreset(a)}
                >
                  {a}
                </button>
              ))}
              <input
                className={`custom${isCustom ? " is-active" : ""}`}
                type="number"
                min="1"
                max="9999"
                inputMode="numeric"
                placeholder="•••"
                aria-label="Custom XLM amount"
                value={customVal}
                onChange={(e) => onCustom(e.target.value)}
              />
            </div>

            <div className="fields">
              <input
                className="field"
                type="text"
                placeholder="Name or @yoursocial"
                aria-label="Name or social handle"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="msg-wrap">
                <textarea
                  className="field"
                  placeholder="Say something nice…"
                  aria-label="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button
                  className="msg-btn"
                  aria-label="Add a heart"
                  onClick={() => setMessage((m) => (m + " 🧡").trim())}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21s-7.5-4.9-10-9.3C.3 8.6 1.7 5 5.1 5c2 0 3.4 1.1 4.4 2.5C10.5 6.1 11.9 5 13.9 5c3.4 0 4.8 3.6 3.1 6.7C16.5 16.1 12 21 12 21z" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              className="support"
              onClick={support}
              disabled={sending || (!!address && !onTestnet)}
              style={{ marginTop: 18 }}
            >
              {supportLabel}
            </button>

            {address && !onTestnet && (
              <div className="notice warn">
                Freighter is on <strong>{network}</strong>. Switch it to <strong>Testnet</strong> to send.
              </div>
            )}

            {address && unfunded && (
              <div className="notice warn">
                This wallet isn&apos;t funded on testnet yet.{" "}
                <button className="friendbot" onClick={fund} disabled={funding}>
                  {funding ? "Funding…" : "Fund with Friendbot"}
                </button>
              </div>
            )}

            {tx.status === "success" && (
              <div className="notice good">
                <strong>Tea sent! 🍵</strong>
                <div style={{ margin: "6px 0" }}>
                  <code>{tx.hash}</code>
                </div>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on stellar.expert →
                </a>
              </div>
            )}
            {tx.status === "error" && (
              <div className="notice bad">
                <strong>Couldn&apos;t send.</strong> {tx.message}
              </div>
            )}

            <p className="footnote">
              Runs on the Stellar testnet — no real funds involved. Each tea is {XLM_PER_TEA} test XLM,
              and your name + message ride along in the transaction memo.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
