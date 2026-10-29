import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const nextConfig: NextConfig = {
  transpilePackages: ["@google/model-viewer"],
  // ponytail: proxy /assets ke backend server-side sehingga pengunjung HP
  // (di balik tunnel HTTPS) tetap bisa memuat GLB/foto. Upgrade: putar S3/CDN.
  async rewrites() {
    return [{ source: "/assets/:path*", destination: `${API_BASE}/assets/:path*` }];
  },
};

export default nextConfig;
