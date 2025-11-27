import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: middleware.ts deprecation warning is informational
  // Next.js 16 still supports middleware.ts, but recommends using proxy pattern in future versions
  // The current middleware implementation works correctly
  
  // Enable standalone output for Docker
  output: 'standalone',
};

export default nextConfig;
