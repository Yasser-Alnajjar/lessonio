"use client";

import { useTranslations } from "next-intl";

import { Separator } from "@/components/ui/separator";
import { LanguageSwitch } from "@/components/shared/language-switch";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SettingsNav } from "../../components/SettingsNav";

export const SettingsAppearanceView = () => {
  const t = useTranslations("settings.appearance");

  return (
    <div className="flex justify-center">
      <div className="mt-4 flex w-full max-w-2xl flex-col gap-4">
        <SettingsNav />

        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        <section className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold">{t("themeTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("themeDescription")}
            </p>
          </div>
          <ThemeToggle />
        </section>

        <Separator />

        <section className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold">{t("languageTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("languageDescription")}
            </p>
          </div>
          <LanguageSwitch />
        </section>
      </div>
    </div>
  );
};
