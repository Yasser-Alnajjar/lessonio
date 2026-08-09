"use client";

import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@navigation";

interface LanguageSwitchProps {
  className?: string;
}

export const LanguageSwitch = ({ className }: LanguageSwitchProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const newLocale = locale === "ar" ? "en" : "ar";

  const changeLanguage = () => {
    router.replace(pathname, {
      locale: newLocale,
    });
  };

  return (
    <Button
      type="button"
      onClick={changeLanguage}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      variant="ghost"
      size="sm"
      className={cn(className)}
    >
      {newLocale === "ar" ? "العربية" : "English"}
    </Button>
  );
};
