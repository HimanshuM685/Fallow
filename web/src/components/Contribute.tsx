import { useEffect, useState } from "react";
import type { ComputeNode } from "@fallow/shared";
import { fetchMyNodes } from "../api";
import { writeClipboard } from "../clipboard";

/**
 * On Fallow you contribute by running the agent daemon (it holds your key,
 * proves ownership, and manages sandboxes). This tab shows the command to start
 * it and lists the nodes currently registered under the connected wallet.
 */
export function Contribute({ address }: { address: string | null }) {
  const [nodes, setNodes] = useState<ComputeNode[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setNodes([]);
      return;
    }
    let alive = true;
    const load = () =>
      fetchMyNodes(address)
        .then((n) => alive && setNodes(n))
        .catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [address]);

  const envCmd = `# set these in .env (copied from .env.example)
STELLAR_PRIVATE_KEY=<your-key>
PRICE_PER_HOUR_USD=1.0
REGISTRY_URL=http://<backend-host>:4000`;
  const runCmd = `# bring up the contributor
docker compose up --build contributor`;

  function copy(id: string, text: string) {
    void writeClipboard(text).then((ok) => {
      if (!ok) return; // don't claim "COPIED" if the copy actually failed
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    });
  }

  return (
    <div>
      <p className="muted">
        Share your machine's CPU/RAM/GPU and earn XLM by the hour, paid out on-chain when a
        renter's lease ends. Renters only ever reach a throwaway Docker SSH sandbox — never your
        files or your host.
      </p>

      <div className="card wide">
        <strong>1. Set your environment (.env)</strong>
        <div className="codeblock">
          <div className="codeblock-bar">
            <span className="codeblock-title">.ENV</span>
            <button
              className={`codeblock-copy${copied === "env" ? " done" : ""}`}
              type="button"
              onClick={() => copy("env", envCmd)}
            >
              {copied === "env" ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre className="codeblock-body">{envCmd}</pre>
        </div>

        <strong>2. Bring up the contributor (Docker)</strong>
        <div className="codeblock">
          <div className="codeblock-bar">
            <span className="codeblock-title">SHELL</span>
            <button
              className={`codeblock-copy${copied === "run" ? " done" : ""}`}
              type="button"
              onClick={() => copy("run", runCmd)}
            >
              {copied === "run" ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre className="codeblock-body">{runCmd}</pre>
        </div>

        <p className="muted small">
          Generate a key with <code>npm run keygen</code>, fund it on testnet, set the values in{" "}
          <code>.env</code>, then bring up the container. It mounts the host Docker socket and runs
          each rented sandbox as a sibling container — nothing else to install. Your node appears in
          Explore within seconds.
        </p>
      </div>

      <h3>Your nodes</h3>
      {!address && <p className="muted">Connect a wallet to see your nodes.</p>}
      {address && nodes.length === 0 && (
        <p className="muted">No nodes yet — start the agent with this wallet's key.</p>
      )}
      <div className="grid">
        {nodes.map((n) => (
          <div className="card" key={n.id}>
            <div className="card-head">
              <strong>{n.label}</strong>
              <span className={`badge ${n.status}`}>{n.status}</span>
            </div>
            <ul className="specs">
              <li>{n.cpuCores} vCPU</li>
              <li>{(n.ramMb / 1024).toFixed(1)} GB RAM</li>
              <li>{n.gpu ?? "no GPU"}</li>
            </ul>
            <div className="price">${n.pricePerHourUsd}/hr</div>
          </div>
        ))}
      </div>
    </div>
  );
}
