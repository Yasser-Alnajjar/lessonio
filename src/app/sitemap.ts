import type { MetadataRoute } from "next";

import { localizedPath, siteUrl } from "@/lib/seo";
import { locales, type AppLocale } from "@/i18n/routing";

const publicPaths = ["/", "/docs"] as const;

function localizedUrl(locale: AppLocale, path: (typeof publicPaths)[number]) {
  return new URL(localizedPath(locale, path), siteUrl).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap((path) =>
    locales.map((locale) => ({
      url: localizedUrl(locale, path),
      alternates: {
        languages: {
          ar: localizedUrl("ar", path),
          en: localizedUrl("en", path),
          "x-default": localizedUrl("ar", path),
        },
      },
    })),
  );
}
