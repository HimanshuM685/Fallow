/**
 * Architecture diagram — hand-drawn inline SVG so it stays on-palette
 * (cream boxes / cream flows on the green field) with no extra deps.
 * Scales fluidly via viewBox.
 */
export function ArchDiagram() {
  return (
    <figure className="arch">
      <svg viewBox="0 0 960 600" role="img" aria-labelledby="arch-title arch-desc">
        <title id="arch-title">Tendril architecture</title>
        <desc id="arch-desc">
          A consumer signs in and tops up at the registry, which meters usage against a Neon ledger,
          settles on Stellar, and orchestrates contributor sandboxes reached over an SSH bore tunnel.
        </desc>

        <defs>
          <marker
            id="ah"
            markerWidth="10"
            markerHeight="10"
            refX="7"
            refY="3"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L7,3 L0,6 Z" className="arrowhead" />
          </marker>
        </defs>

        {/* ── flows (drawn first, under the boxes) ───────────────────── */}
        {/* consumer ↔ sandbox : SSH over bore tunnel */}
        <line className="flow" x1="290" y1="88" x2="670" y2="88" markerStart="url(#ah)" markerEnd="url(#ah)" />
        <text className="f-lbl" x="480" y="74" textAnchor="middle">SSH · BORE TUNNEL</text>

        {/* consumer → registry : sign in / top up / rent */}
        <line className="flow" x1="165" y1="136" x2="165" y2="240" markerEnd="url(#ah)" />
        <text className="f-lbl" x="178" y="180" textAnchor="start">SIGN IN ·</text>
        <text className="f-lbl" x="178" y="196" textAnchor="start">TOP UP ·</text>
        <text className="f-lbl" x="178" y="212" textAnchor="start">RENT</text>

        {/* registry ↔ contributor : websocket */}
        <line className="flow" x1="360" y1="305" x2="670" y2="305" markerStart="url(#ah)" markerEnd="url(#ah)" />
        <text className="f-lbl" x="515" y="291" textAnchor="middle">WEBSOCKET</text>
        <text className="f-lbl" x="515" y="325" textAnchor="middle">LEASE / RELEASE</text>

        {/* contributor → sandbox : docker run */}
        <line className="flow" x1="795" y1="240" x2="795" y2="136" markerEnd="url(#ah)" />
        <text className="f-lbl" x="808" y="184" textAnchor="start">DOCKER RUN</text>
        <text className="f-lbl" x="808" y="200" textAnchor="start">(HARDENED)</text>

        {/* registry → neon : ledger */}
        <line className="flow" x1="130" y1="370" x2="130" y2="470" markerEnd="url(#ah)" />
        <text className="f-lbl" x="143" y="424" textAnchor="start">LEDGER</text>

        {/* registry → stellar : confirm / payout */}
        <line className="flow" x1="300" y1="370" x2="395" y2="470" markerEnd="url(#ah)" />
        <text className="f-lbl" x="360" y="415" textAnchor="start">CONFIRM ·</text>
        <text className="f-lbl" x="360" y="431" textAnchor="start">PAYOUT</text>

        {/* ── boxes ──────────────────────────────────────────────────── */}
        {/* consumer */}
        <g>
          <rect className="box-fill" x="40" y="40" width="250" height="96" />
          <rect className="box-edge" x="44" y="44" width="242" height="88" />
          <text className="b-title" x="165" y="80" textAnchor="middle">CONSUMER / AGENT</text>
          <text className="b-sub" x="165" y="104" textAnchor="middle">BROWSER · HEADLESS BOT</text>
        </g>

        {/* sandbox */}
        <g>
          <rect className="box-fill" x="670" y="40" width="250" height="96" />
          <rect className="box-edge" x="674" y="44" width="242" height="88" />
          <text className="b-title" x="795" y="80" textAnchor="middle">SANDBOX</text>
          <text className="b-sub" x="795" y="104" textAnchor="middle">EPHEMERAL DOCKER · SSH</text>
        </g>

        {/* registry */}
        <g>
          <rect className="box-fill" x="40" y="240" width="320" height="130" />
          <rect className="box-edge" x="44" y="244" width="312" height="122" />
          <text className="b-title" x="200" y="288" textAnchor="middle">REGISTRY · API</text>
          <text className="b-sub" x="200" y="312" textAnchor="middle">EXPRESS · SOCKET.IO</text>
          <text className="b-sub" x="200" y="332" textAnchor="middle">METER · BILLS BY TIME</text>
        </g>

        {/* contributor */}
        <g>
          <rect className="box-fill" x="670" y="240" width="250" height="130" />
          <rect className="box-edge" x="674" y="244" width="242" height="122" />
          <text className="b-title" x="795" y="298" textAnchor="middle">CONTRIBUTOR PC</text>
          <text className="b-sub" x="795" y="322" textAnchor="middle">DAEMON · BORE · DOCKER</text>
        </g>

        {/* neon */}
        <g>
          <rect className="box-fill" x="40" y="470" width="200" height="90" />
          <rect className="box-edge" x="44" y="474" width="192" height="82" />
          <text className="b-title" x="140" y="510" textAnchor="middle">NEON</text>
          <text className="b-sub" x="140" y="532" textAnchor="middle">WALLETS · CHARGES</text>
        </g>

        {/* stellar */}
        <g>
          <rect className="box-fill" x="300" y="470" width="200" height="90" />
          <rect className="box-edge" x="304" y="474" width="192" height="82" />
          <text className="b-title" x="400" y="510" textAnchor="middle">STELLAR</text>
          <text className="b-sub" x="400" y="532" textAnchor="middle">HORIZON · TESTNET</text>
        </g>
      </svg>
      <figcaption className="arch-cap">
        // FIG.1 — money &amp; compute flow. The registry meters time against the Neon ledger and
        settles in native XLM; the renter reaches the sandbox directly over the bore tunnel.
      </figcaption>
    </figure>
  );
}
