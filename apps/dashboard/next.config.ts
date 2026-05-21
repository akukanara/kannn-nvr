import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NVR_API_URL || 'http://localhost:8080'}/api/:path*`,
      },
      {
        source: '/video/:path*',
        destination: `${process.env.NVR_API_URL || 'http://localhost:8080'}/video/:path*`,
      },
      {
        source: '/image/:path*',
        destination: `${process.env.NVR_API_URL || 'http://localhost:8080'}/image/:path*`,
      },
      {
        source: '/mp4/:path*',
        destination: `${process.env.NVR_API_URL || 'http://localhost:8080'}/mp4/:path*`,
      },
    ];
  },
};

export default nextConfig;
