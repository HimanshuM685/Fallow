import type { WalletSummary } from "@fallow/shared";
import type { Session } from "../App";
import type { ActiveLease } from "../api";
import { WalletPanel } from "./WalletPanel";
import { Explore } from "./Explore";
import { Contribute } from "./Contribute";
import { LeasePanel } from "./LeasePanel";

interface Props {
  tab: "explore" | "contribute";
  session: Session | null;
  wallet: WalletSummary | null;
  activeAddress: string | null;
  signXdr: (xdr: string) => Promise<string>;
  onWalletChanged: () => void;
  onError: (e: string | null) => void;
  lease: ActiveLease | null;
  onLeased: (l: ActiveLease | null) => void;
}

/** The rentable marketplace — backs both /explore and /contribute. */
export function Marketplace({
  tab,
  session,
  wallet,
  activeAddress,
  signXdr,
  onWalletChanged,
  onError,
  lease,
  onLeased,
}: Props) {
  return (
    <>
      {session && (
        <WalletPanel
          wallet={wallet}
          address={session.address}
          signXdr={signXdr}
          token={session.token}
          onChanged={onWalletChanged}
          onError={onError}
        />
      )}

      <section className="index">
        <div className="section-head">
          <div className="sh-left">
            <p className="kicker">// {tab === "explore" ? "THE MARKETPLACE" : "SHARE COMPUTE"}</p>
            <h2 className="display section-title">{tab === "explore" ? "EXPLORE" : "CONTRIBUTE"}</h2>
          </div>
        </div>
        <div className="rule"></div>

        {tab === "explore" ? (
          <Explore
            session={session}
            balanceStroops={wallet?.balanceStroops ?? 0}
            onLeased={onLeased}
          />
        ) : (
          <Contribute address={activeAddress} />
        )}

        {lease && <LeasePanel lease={lease} onRelease={() => onLeased(null)} />}
      </section>
    </>
  );
}
