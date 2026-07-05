"use client";

import dynamic from "next/dynamic";

// The campaign talks to wallet extensions (window-only), so render it
// client-side and skip SSR entirely.
const Campaign = dynamic(() => import("@/components/Campaign"), { ssr: false });

export default function Home() {
  return <Campaign />;
}
