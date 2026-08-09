import { getTranslations } from "next-intl/server";

import { StudyLineMark } from "@/components/shared/study-line-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitch } from "@/components/shared/language-switch";

interface AuthShellProps {
  children: React.ReactNode;
}

/**
 * Pure layout composition — no data fetching, no business logic — so it's
 * safe to render directly from each feature's SSR component (AuthLogin,
 * AuthRegister, ...) without breaking the "SSR is data-only" rule.
 */
export async function AuthShell({ children }: AuthShellProps) {
  const t = await getTranslations("auth.shell");

  return (
    <div className="bg-background grid min-h-svh lg:grid-cols-2">
      <section className="from-primary/10 via-background to-highlighter/10 relative hidden flex-col justify-between overflow-hidden bg-linear-to-br p-10 lg:flex">
        <div className="flex items-center gap-2">
          <StudyLineMark className="h-8 w-auto" />
          <span className="font-display text-lg">{t("brand")}</span>
        </div>

        <div className="flex max-w-md flex-col gap-4">
          <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {t("eyebrow")}
          </span>
          <h1 className="font-display text-4xl leading-[1.1] font-medium text-balance">
            {t("headline")}
          </h1>
          <p className="text-muted-foreground text-base text-balance">
            {t("body")}
          </p>
        </div>

        <p className="text-muted-foreground/70 text-xs">{t("footnote")}</p>
      </section>

      <section className="flex flex-col gap-6 p-6 sm:p-10">
        <div className="flex items-center justify-between lg:justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-2 lg:hidden">
            <StudyLineMark className="h-7 w-auto" />
            <span className="font-display text-base">{t("brand")}</span>
          </div>
          <ThemeToggle />
          <LanguageSwitch />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </section>
    </div>
  );
}
