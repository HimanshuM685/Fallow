import { useEffect, useState } from "react";

/**
 * Landing hero with an encryption / hashing animation — purely presentational.
 * The headline "decrypts" into place on mount (each glyph scrambles then locks),
 * and a terminal block shows a live SHA-256-style hash churning continuously.
 * Respects prefers-reduced-motion. No deps, no network.
 */

const HEX = "0123456789abcdef";
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$/<>+=*";
const TITLE = "RENT REAL COMPUTE";
const ROWS = ["payload", "lease", "wallet", "sealed"];

function randomHex(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

interface HashHeroProps {
  onEnter: () => void;
  onDocs: () => void;
  onAbout: () => void;
}

export function HashHero({ onEnter, onDocs, onAbout }: HashHeroProps) {
  const [display, setDisplay] = useState<string>(TITLE);
  const [hashes, setHashes] = useState<string[]>(() => ROWS.map(() => randomHex(48)));

  // Headline "decrypt" reveal: lock characters left-to-right, scramble the rest.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(TITLE);
      return;
    }
    const total = 34;
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      const revealed = Math.floor((frame / total) * TITLE.length);
      setDisplay(
        TITLE.split("")
          .map((ch, i) => (ch === " " ? " " : i < revealed ? ch : randomGlyph()))
          .join(""),
      );
      if (frame >= total) {
        setDisplay(TITLE);
        clearInterval(id);
      }
    }, 45);
    return () => clearInterval(id);
  }, []);

  // Continuous hash churn in the terminal.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => setHashes(ROWS.map(() => randomHex(48))), 80);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero">
      <p className="kicker">PREPAID&nbsp;COMPUTE&nbsp;&bull;&nbsp;SSH&nbsp;SANDBOXES&nbsp;&bull;&nbsp;METERED&nbsp;IN&nbsp;XLM</p>

      <h1 className="display hero-title">{display}</h1>

      <div className="hero-cta">
        <button className="btn" onClick={onEnter}>
          EXPLORE THE MARKETPLACE&nbsp;→
        </button>
        <button className="btn ghost" onClick={onDocs}>
          DOCS
        </button>
        <button className="btn ghost" onClick={onAbout}>
          ABOUT
        </button>
      </div>

      <div className="hero-foot">
        <p className="hero-body">
          FALLOW&nbsp;RENTS&nbsp;REAL&nbsp;MACHINES&nbsp;BY&nbsp;THE&nbsp;HOUR.&nbsp;TOP&nbsp;UP&nbsp;XLM&nbsp;ONCE,
          GET&nbsp;A&nbsp;SANDBOXED&nbsp;SSH&nbsp;BOX,&nbsp;AND&nbsp;PAY&nbsp;ONLY&nbsp;FOR&nbsp;THE&nbsp;TIME&nbsp;YOU&nbsp;USE.
        </p>

        <div className="terminal">
          <div className="terminal-tabs">
            <span className="tab tab-active">SHA-256</span>
            <span className="tab">LEDGER</span>
            <span className="copy" aria-hidden="true">●&nbsp;●&nbsp;●</span>
          </div>
          <pre className="terminal-body"><span className="t-prompt">&gt;</span> hashing lease stream…
{ROWS.map((label, i) => (
  <span className="hash-line" key={label}>{hashes[i]}  <span className="hash-label">{label}</span>
</span>
))}<span className="t-cursor">█</span></pre>
        </div>
      </div>
    </section>
  );
}
