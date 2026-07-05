import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fallow — Stellar Testnet Tip Jar",
  description: "Buy Himanshu some tea on the Stellar testnet.",
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
