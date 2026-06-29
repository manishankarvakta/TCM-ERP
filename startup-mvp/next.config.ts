import type { NextConfig } from "next";

// Parse allowed origins for Server Actions dynamically from environment variables
const allowedOrigins: string[] = [
  'localhost:3000',
  'localhost:3001',
  'localhost:3002',
  'fferp.aamardokan.online',
  'ferrarifashionbd.cloud',
  'www.fferp.aamardokan.online',
  'www.ferrarifashionbd.cloud'
];

const addHostFromUrl = (urlString?: string) => {
  if (!urlString) return;
  try {
    const url = new URL(urlString);
    allowedOrigins.push(url.host);
  } catch (e) {
    allowedOrigins.push(urlString.replace(/^https?:\/\//, ''));
  }
};

addHostFromUrl(process.env.NEXT_PUBLIC_APP_URL);
addHostFromUrl(process.env.NEXTAUTH_URL);

if (process.env.ALLOWED_ORIGINS) {
  const customOrigins = process.env.ALLOWED_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  allowedOrigins.push(...customOrigins);
}

const uniqueAllowedOrigins = Array.from(new Set(allowedOrigins));

const nextConfig: NextConfig = {
  /* config options here */
  // Note: middleware.ts deprecation warning is informational
  // Next.js 16 still supports middleware.ts, but recommends using proxy pattern in future versions
  // The current middleware implementation works correctly
  
  // Enable standalone output for Docker
  output: 'standalone',

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: uniqueAllowedOrigins,
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
