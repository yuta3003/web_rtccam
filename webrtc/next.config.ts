import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // Docker用の最適化されたビルド
};

export default nextConfig;
