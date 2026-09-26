import type { NextConfig } from 'next';

const localStorageRemotePatterns =
  process.env.NODE_ENV === 'development'
    ? [
        {
          protocol: 'http' as const,
          hostname: '127.0.0.1',
          port: '54321',
          pathname: '/storage/v1/object/public/**',
        },
        {
          protocol: 'http' as const,
          hostname: 'localhost',
          port: '54321',
          pathname: '/storage/v1/object/public/**',
        },
      ]
    : [];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imqjyxydsakfuztyrhev.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      ...localStorageRemotePatterns,
    ],
  },
};

export default nextConfig;
