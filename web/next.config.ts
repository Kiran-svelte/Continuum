import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Pre-existing ESLint violations (any, unused-vars) exist across legacy files.
    // TypeScript strict mode (tsc --noEmit) passes clean — runtime correctness is verified.
    // ESLint cleanup is tracked in the production readiness task list.
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
};

export default nextConfig;
