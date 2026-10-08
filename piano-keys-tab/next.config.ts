import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native modules must not be bundled into the server graph.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  images: {
    formats: ["image/avif", "image/webp"],
    // All imagery is generated locally (SVG covers / local assets) — no remote loaders.
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
