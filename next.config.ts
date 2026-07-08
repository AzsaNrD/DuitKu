import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite memuat WASM sendiri — jangan di-bundle oleh Next
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
