import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  typedRoutes: true,

  images: {
    // Attachment `publicUrl`s now come from the Laravel backend's storage
    // disk rather than Supabase Storage. Add a remotePattern for that host
    // once the backend's storage domain (or same-origin nginx setup) is
    // finalized — see BACKEND_URL / NEXT_PUBLIC_API_BASE_URL.
    remotePatterns: [],
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
    // through a Server Action; the backend accepts up to 50 MB per file, so
    // the request body limit must clear that plus multipart overhead.
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
