/** Static about page — presentational only. */
export function About() {
  return (
    <section className="page">
      <div className="section-head">
        <p className="kicker">// COLOPHON</p>
        <h2 className="display section-title">ABOUT</h2>
      </div>
      <div className="rule"></div>

      <div className="about-grid">
        <div className="prose panel">
        <p>
          Tendril is a lean, agent-first take on Akash / io.net — but for <strong>individuals</strong>{" "}
          instead of data centers. Anyone can rent out their PC's CPU/RAM/GPU; anyone (a human or an
          autonomous agent) can rent it by the hour, prepaid in native XLM.
        </p>

        <h3>Why prepaid + metered</h3>
        <p>
          You top up a balance once, then renting just spends it — no per-action signing, no x402.
          Time is billed against that balance and the session stops when it's gone, so you only ever
          pay for the compute you used.
        </p>

        <h3>The trust model</h3>
        <p>A contributor gives compute, never filesystem or account access. The boundary is an ephemeral Docker container:</p>
        <ul>
          <li>no host filesystem mounts, no host network;</li>
          <li>nearly all Linux capabilities dropped, no new privileges;</li>
          <li>hard CPU / memory / PID caps;</li>
          <li>destroyed the moment the paid lease ends.</li>
        </ul>

        <h3>The two agentic endpoints</h3>
        <ul>
          <li><code>GET /explorer</code> — free, so an agent can survey live nodes and choose for itself.</li>
          <li><code>POST /rent/:id</code> — starts an hourly-metered session against a prepaid balance, billed once at release.</li>
        </ul>

        <h3>Stack</h3>
        <p>
          TypeScript everywhere. Vite + React + <code>@creit.tech/stellar-wallets-kit</code>
          (Freighter/xBull/…) on the web; Express + socket.io + Neon Postgres for the registry;
          Docker + bore for sandboxes; @stellar/stellar-sdk for native-XLM payments and on-chain
          payouts via Horizon. Stellar testnet.
        </p>

        <p className="muted small">Open source · no tracking · HTML / CSS / TS</p>
        </div>

        <figure className="about-art">
          <img src="/hero-art.jpg" alt="Tendril — many hands, one machine" loading="lazy" />
        </figure>
      </div>
    </section>
  );
}
