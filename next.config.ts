import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We lint with oxlint (npm run lint), so skip Next's built-in ESLint step.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
