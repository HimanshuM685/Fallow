import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// @stellar/stellar-sdk expects a few Node globals (Buffer, etc.) in the browser;
// nodePolyfills provides them. @fallow/shared is aliased to its TS source so Vite
// transpiles it without a separate build step.
export default defineConfig({
  plugins: [react(), nodePolyfills({ globals: { Buffer: true, global: true, process: true } })],
  resolve: {
    alias: {
      "@fallow/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [resolve(__dirname, "..")] },
  },
  build: {
    rollupOptions: {
      output: {
        // Split the big, rarely-changing vendors out of the app chunk so an app
        // edit doesn't re-download the SDK (~1MB) — browsers keep the cached copy.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@stellar/stellar-sdk") || id.includes("stellar-wallets-kit"))
            return "stellar";
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) return "react";
          return undefined;
        },
      },
    },
  },
});
