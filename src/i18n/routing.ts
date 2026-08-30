import { defineRouting } from "next-intl/routing";

export const locales = ["en", "ar"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "ar";

export const localeDirections: Record<AppLocale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  ar: "العربية",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  // Otherwise a browser sending `Accept-Language: en` gets redirected to
  // `/en` on first visit despite `defaultLocale` being "ar" — negotiation
  // only kicks in once `NEXT_LOCALE` is set (e.g. via `LanguageSwitch`).
  localeDetection: false,
});
