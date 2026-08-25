import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.18.68', 'localhost', '127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'supabase.geneze.online',
      },
    ],
  },
};

export default nextConfig;
