import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The test environment is reached by hostname from other machines; without this, dev resources are blocked and nothing hydrates.
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  cacheComponents: true,
  // No floating dev badge: it reads as part of the product to anyone testing; errors still reach the console and the log.
  devIndicators: false,
  partialPrefetching: true,
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
