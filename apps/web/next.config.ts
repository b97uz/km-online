import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@km/db", "@km/shared"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
