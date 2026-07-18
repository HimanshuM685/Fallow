import { ArchDiagram } from "./ArchDiagram";

/** Static documentation page — presentational only. */
export function Docs() {
  return (
    <section className="page">
      <div className="section-head">
        <p className="kicker">// MANUAL</p>
        <h2 className="display section-title">DOCS</h2>
      </div>
      <div className="rule"></div>

      <div className="prose panel">
        <p>
          Fallow is a prepaid marketplace for renting real machines by the hour, settled in native
          XLM on Stellar. Top up once, rent a node, get a sandboxed SSH box, and pay only for the
          time you actually use — billed when you release. No per-action signing, no x402.
        </p>

        <h3>Architecture</h3>
        <p>
          Three independent pieces talk to one central registry. A <strong>consumer</strong> (a person
          in this UI, or a headless agent) tops up and rents. The <strong>registry</strong> holds the
          off-chain balance ledger in Neon, confirms deposits and pays out on Stellar, and brokers
          leases to <strong>contributors</strong> over a WebSocket. The rented box itself is reached
          directly — the renter's SSH traffic rides a bore tunnel straight into the sandbox.
        </p>

        <ArchDiagram />

        <h3>1 · Connect &amp; sign in</h3>
        <p>
          Connect Freighter, xBull, or another Stellar wallet (testnet) from the top bar, then <strong>Sign in</strong>.
          Signing a one-time login challenge proves you control the address — no funds move. It mints
          a session so only you can spend your balance.
        </p>

        <h3>2 · Top up</h3>
        <p>
          Open the wallet panel and deposit XLM. You sign one <code>payment</code> transaction to the
          platform's custodial address; the registry confirms it on-chain and credits your prepaid
          balance. Crediting is idempotent per transaction id — a deposit can never be counted twice.
          Every deposit is kept as history.
        </p>

        <h3>3 · Rent &amp; connect over SSH</h3>
        <p>
          Pick a node in <strong>Explore</strong> and hit Rent (no popup — it just checks your
          balance). You get a copyable SSH command; your <strong>wallet address is the password</strong>:
        </p>
        <pre className="cmd">ssh root@&lt;host&gt; -p &lt;port&gt;   # password = your wallet address</pre>
        <p>
          The host and port resolve through a bore tunnel that runs inside the sandbox, so the
          contributor never opens a port on their own host. The sandbox is a throwaway, hardened
          Docker container — destroyed the moment the lease ends.
        </p>

        <h3>Billing</h3>
        <ul>
          <li>Nodes are priced per <strong>hour</strong> (USD), converted to XLM at a configurable rate.</li>
          <li>
            Usage is metered continuously but <strong>charged once</strong>, when you release —
            prorated to the exact seconds used.
          </li>
          <li>If your balance can't cover the running time, the session is stopped automatically.</li>
          <li>The contributor is paid on-chain to their address when the lease ends, minus a small platform fee.</li>
        </ul>

        <h3>For agents — the two endpoints</h3>
        <p>The whole flow is reachable headlessly; only two endpoints matter to a bot:</p>
        <ul>
          <li><code>GET /explorer</code> — free, so an agent can survey live nodes (specs + price) and choose for itself.</li>
          <li>
            <code>POST /rent/:id</code> — starts an hourly-metered session against the agent's prepaid
            balance, billed once at release. Top up ahead of time, rent, run, release — zero clicks.
          </li>
        </ul>

        <h3>Contributing compute</h3>
        <p>
          Run the contributor daemon on the machine you want to share — it advertises specs, proves
          ownership by signing a nonce, heartbeats, and launches sandboxes on demand:
        </p>
        <pre className="cmd">STELLAR_PRIVATE_KEY=&lt;your-key&gt; PRICE_PER_HOUR_USD=1.0 npm run contributor</pre>
        <p>Renters reach the box through a bore tunnel that runs inside the sandbox — nothing to open on your host.</p>

        <h3>Safety</h3>
        <ul>
          <li>No host filesystem mounts, no host network, nearly all Linux capabilities dropped.</li>
          <li>Hard CPU / memory / PID caps.</li>
          <li>The container is destroyed when the lease ends — every time.</li>
        </ul>

        <h3>Notes &amp; limits</h3>
        <ul>
          <li>
            <strong>Custodial:</strong> top-ups pool at one platform address and balances live as an
            off-chain ledger in Neon. There's no on-chain withdrawal path yet.
          </li>
          <li>
            <strong>Metering granularity:</strong> charges land at release; a depleted balance is
            caught on the next meter tick, so worst-case over-use is one tick of compute.
          </li>
          <li>Everything runs on <strong>Stellar testnet</strong> — top up with Friendbot XLM, no trustline needed.</li>
        </ul>
      </div>
    </section>
  );
}
