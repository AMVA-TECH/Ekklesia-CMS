import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components on; Partial Prefetching off until auth-gated routes have
  // proper Suspense shells. Instant-nav validation was thrashing /home ↔ /sign-in.
  cacheComponents: true,
  partialPrefetching: false,
  experimental: {
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  // pg is Node-only; keep it external so Turbopack/webpack do not try to bundle it.
  serverExternalPackages: ["pg", "drizzle-orm"],
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
