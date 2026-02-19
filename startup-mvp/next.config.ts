import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: middleware.ts deprecation warning is informational
  // Next.js 16 still supports middleware.ts, but recommends using proxy pattern in future versions
  // The current middleware implementation works correctly
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configure images for external sources (MinIO)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Increase Server Actions body size limit
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
