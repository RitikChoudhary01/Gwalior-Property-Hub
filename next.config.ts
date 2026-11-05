import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  images: {
    // Serve Supabase-hosted property images through Next.js image CDN
    // (auto-resizes, converts to WebP/AVIF, and edge-caches them)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bhuthrpskgggeqwvsodl.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Allow large hero images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // Cache images at CDN for 24 hours
  },
};

export default nextConfig;

