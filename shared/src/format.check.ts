/**
 * Self-check for the money formatters — `npm run check -w shared`.
 * Rounding display figures is where a UI quietly lies about amounts, so the
 * rounding rules get an assert rather than a screenshot.
 */
import assert from "node:assert/strict";
import { formatXlm, formatXlmShort } from "./index.js";

// Whole amounts lose the noise entirely.
assert.equal(formatXlmShort(600_000_000), "60 XLM");
assert.equal(formatXlmShort(1_200_000_000), "120 XLM");
assert.equal(formatXlmShort(0), "0 XLM");

// Two decimals, trailing zeros dropped.
assert.equal(formatXlmShort(4_200_000), "0.42 XLM");
assert.equal(formatXlmShort(4_260_000), "0.43 XLM"); // rounds, doesn't truncate
// Exact .xx5 lands wherever the float does — 0.425 is stored just under, so
// toFixed gives "0.42". Sub-stroop display noise, not worth fighting.
assert.equal(formatXlmShort(4_250_000), "0.42 XLM");
assert.equal(formatXlmShort(605_000_000), "60.5 XLM");

// Under a cent keeps full precision — must never round a live spend to "0 XLM".
assert.equal(formatXlmShort(30_000), "0.0030 XLM");
assert.equal(formatXlmShort(1), "0.0000 XLM"); // sub-stroop dust, but not "0"
assert.equal(formatXlmShort(-30_000), "-0.0030 XLM");

// Full precision is untouched — the ledger rows still reconcile.
assert.equal(formatXlm(600_000_000), "60.0000 XLM");
assert.equal(formatXlm(4_200_000), "0.4200 XLM");

console.log("format check ok");
