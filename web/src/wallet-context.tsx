import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { connectWallet, disconnectWallet, restoreWallet, signWithWallet } from "./wallet-kit";

// A tiny React context over the imperative StellarWalletsKit, exposing the shape
// the app consumes: the active address, a readiness flag (so a reload's silent
// reconnect doesn't flash the disconnected state), connect/disconnect, and an
// XDR signer. Replaces @txnlab/use-wallet-react's provider + hook.
interface WalletContextValue {
  activeAddress: string | null;
  isReady: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signXdr: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Resume a previously connected wallet once, on mount.
  useEffect(() => {
    let cancelled = false;
    restoreWallet()
      .then((r) => {
        if (!cancelled && r) setActiveAddress(r.address);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    const { address } = await connectWallet();
    setActiveAddress(address);
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setActiveAddress(null);
  }, []);

  const signXdr = useCallback(
    async (xdr: string) => {
      if (!activeAddress) throw new Error("connect a wallet first");
      return signWithWallet(xdr, activeAddress);
    },
    [activeAddress],
  );

  return (
    <WalletContext.Provider value={{ activeAddress, isReady, connect, disconnect, signXdr }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
