import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./wallet-context";
import { App } from "./App";
import "./styles.css";

// StellarWalletsKit multi-wallet connector (Freighter, xBull, Albedo, Lobstr,
// Rabet, Hana) on Stellar testnet. Connecting a wallet is the auth layer; the
// same wallet signs the native XLM payments — one chain, one signature.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </WalletProvider>
  </React.StrictMode>,
);
