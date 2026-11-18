import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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

// Plugin typings can resolve a sibling Next version in the monorepo workspace.
export default withNextIntl(nextConfig) as typeof nextConfig;
