import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Ignore type error for eslint config
  eslint: {
    ignoreDuringBuilds: true,
  },
  // @ts-ignore - Ignore type error for typescript config
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
