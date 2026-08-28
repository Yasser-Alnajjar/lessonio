import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

const privatePaths = [
  "/api/",
  "/auth/",
  "/calendar/",
  "/classes/",
  "/classroom/",
  "/dashboard/",
  "/exams/",
  "/flashcards/",
  "/gamification/",
  "/grades/",
  "/help/",
  "/home",
  "/homework/",
  "/lessons/",
  "/notifications/",
  "/onboarding/",
  "/search/",
  "/settings/",
  "/statistics/",
  "/study-sessions/",
  "/subjects/",
  "/teaching/",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = privatePaths.flatMap((path) => [path, `/en${path}`]);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
