import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Note: middleware.ts deprecation warning is informational
  // Next.js 16 still supports middleware.ts, but recommends using proxy pattern in future versions
  // The current middleware implementation works correctly
  
  // Enable standalone output for Docker
  output: 'standalone',

  // Increase body size limit for Server Actions (essential for file uploads)
  serverActions: {
    bodySizeLimit: '50mb',
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  
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
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  async redirects() {
    return [
      {
        source: '/dashboard/hr/attendance/devices',
        destination: '/dashboard/hr/biometric/devices',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
