import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: [
    'winston',
    'winston-loki',
    'snappy',
    '@napi-rs/snappy-win32-x64-msvc',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  headers: async () => [
    {
      // HTML pages — tell Cloudflare/CDNs never to cache; always serve fresh
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Cache-Control',
          value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
        {
          key: 'CDN-Cache-Control',
          value: 'no-store',
        },
        {
          key: 'Surrogate-Control',
          value: 'no-store',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://accounts.google.com https://vercel.live https://va.vercel-scripts.com https://www.googletagmanager.com https://static.cloudflareinsights.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://continuum.support https://*.vercel.app https://*.appwrite.io",
            "font-src 'self' data:",
            "connect-src 'self' https://accounts.google.com https://*.pusher.com wss://*.pusher.com https://*.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com https://cloudflareinsights.com https://*.cloudflareinsights.com",
            "frame-src 'self' https://accounts.google.com",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
    {
      // Static assets — these are content-hashed so can be cached forever
      source: '/_next/static/(.*)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
};

export default nextConfig;
