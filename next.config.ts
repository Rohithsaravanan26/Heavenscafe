import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure CSS is processed correctly on Vercel
  experimental: {
    // Use the new CSS chunking for better performance
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@tanstack/react-query",
    ],
  },
  // Allow images from supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pxadovlmslbszctwxdzl.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
