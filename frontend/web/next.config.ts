import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ WARNING: This will ignore ALL TypeScript errors during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
