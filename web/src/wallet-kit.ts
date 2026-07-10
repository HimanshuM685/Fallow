// Multi-wallet connector built on StellarWalletsKit (v2, static API). The kit
// renders a modal to pick from any installed Stellar wallet — Freighter, xBull,
// Albedo, Lobstr, Rabet, Hana — then reads the active address and signs
// transactions. Everything here is browser-only (the wallet modules touch
// `window`), so the kit is initialized lazily.

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { Networks } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule, FREIGHTER_ID } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";

const STORAGE_KEY = "tendril_wallet_id";

let started = false;

function ensureInit(): void {
  if (typeof window === "undefined") {
    throw new Error("Wallet is only available in the browser");
  }
  if (started) return;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    selectedWalletId: saved ?? FREIGHTER_ID,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new LobstrModule(),
      new RabetModule(),
      new HanaModule(),
    ],
  });
  started = true;
}

/** Opens the wallet picker and resolves with the selected wallet's address. */
export async function connectWallet(): Promise<{
  address: string;
  walletId: string;
  walletName?: string;
}> {
  ensureInit();
  const { address } = await StellarWalletsKit.authModal();
  const mod = StellarWalletsKit.selectedModule;
  const walletId = mod?.productId ?? FREIGHTER_ID;
  window.localStorage.setItem(STORAGE_KEY, walletId);
  return { address, walletId, walletName: mod?.productName };
}

/** Silently restore a previously connected wallet on page load, if possible. */
export async function restoreWallet(): Promise<{ address: string; walletId: string } | null> {
  if (typeof window === "undefined") return null;
  const walletId = window.localStorage.getItem(STORAGE_KEY);
  if (!walletId) return null;
  try {
    ensureInit();
    StellarWalletsKit.setWallet(walletId);
    const { address } = await StellarWalletsKit.fetchAddress();
    return { address, walletId };
  } catch {
    return null; // wallet locked / uninstalled — stay disconnected
  }
}

/** Sign an XDR with the active wallet; returns the signed transaction XDR. */
export async function signWithWallet(xdr: string, address: string): Promise<string> {
  ensureInit();
  const res = await StellarWalletsKit.signTransaction(xdr, {
    address,
    networkPassphrase: Networks.TESTNET,
  });
  return res.signedTxXdr;
}

export async function disconnectWallet(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  try {
    ensureInit();
    await StellarWalletsKit.disconnect();
  } catch {
    // some wallets have no explicit disconnect — clearing local state is enough
  }
}
