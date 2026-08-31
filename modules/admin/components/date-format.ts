"use client";

import { useLocale } from "next-intl";
import { arEG } from "date-fns/locale/ar-EG";

/** `date-fns`'s `format()` defaults to English regardless of the app locale — pass this to its `{ locale }` option. */
export function useDateFnsLocale() {
  const locale = useLocale();
  return locale === "ar" ? arEG : undefined;
}
