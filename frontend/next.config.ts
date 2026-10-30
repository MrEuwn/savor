import type { NextConfig } from "next";

// Server-only (tanpa NEXT_PUBLIC_ => tidak masuk bundle browser)
const API_BASE = process.env.API_BASE_SERVER || "http://localhost:8000";

const nextConfig: NextConfig = {
  transpilePackages: ["@google/model-viewer"],
  // ponytail: proxy /assets dan /api ke backend server-side sehingga pengunjung
  // HP (di balik tunnel HTTPS) tidak perlu menjangkau IP laptop.
  // Upgrade: S3/CDN untuk aset, backend langsung deploy (Vercel/Render).
  async rewrites() {
    return [
      { source: "/assets/:path*", destination: `${API_BASE}/assets/:path*` },
      { source: "/api/:path*", destination: `${API_BASE}/:path*` },
    ];
  },
};

export default nextConfig;
