import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  typedRoutes: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@tanstack/react-table",
      "date-fns",
    ],
    // Attachment uploads (Actions.Attachments.upload) send the file straight
    // through a Server Action; the "attachments" Storage bucket allows up to
    // 50 MB, so the request body limit must clear that plus multipart overhead.
    serverActions: {
      bodySizeLimit: "55mb",
    },
    // Keeps navigations, prefetches, and Server Actions (all mutations in
    // this app) pending instead of throwing when the network drops, then
    // retries them automatically once connectivity returns.
    useOffline: true,
  },
};

export default withNextIntl(nextConfig);
