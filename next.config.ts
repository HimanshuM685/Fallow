import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We lint with oxlint (npm run lint), so skip Next's built-in ESLint step.
  eslint: { ignoreDuringBuilds: true },
  // The wallet kit ships ESM that Next should transpile through its pipeline.
  transpilePackages: ["@creit.tech/stellar-wallets-kit"],
};

export default nextConfig;
