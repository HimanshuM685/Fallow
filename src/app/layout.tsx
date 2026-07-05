import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fallow — Stellar Crowdfunding",
  description:
    "Back an open-source campaign with real testnet XLM, escrowed by a Soroban smart contract.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
