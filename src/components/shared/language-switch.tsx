"use client";

import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={changeLanguage}
            aria-label={
              locale === "ar" ? "Switch to English" : "التبديل إلى العربية"
            }
            variant="ghost"
            size="sm"
            className={cn(className)}
          >
            {newLocale === "ar" ? "العربية" : "English"}
          </Button>
        </TooltipTrigger>

        <TooltipContent>
          {newLocale === "ar" ? "العربية" : "English"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
