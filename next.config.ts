import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  distDir: ".next",
  output: "standalone",
  partialPrefetching: true,
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  reactCompiler: true,
  reactStrictMode: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
