import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Actions } from "@/actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/shared/language-switch";
import { LessonioMark } from "@/components/shared/lessonio-mark";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const FEATURE_ICONS = {
  subjects: GraduationCap,
  homework: ClipboardList,
  calendar: CalendarDays,
  statistics: BarChart3,
} as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tApp = await getTranslations("app");
  const { data: user } = await Actions.Auth.getSession();

  return (
    <div className="bg-background flex min-h-svh flex-col">
      {/* Header */}
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-6">
          <div className="flex items-center gap-2">
            <LessonioMark className="h-6 w-auto" />
            <span className="text-md">Lessonio</span>
          </div>

          <div className="ms-auto flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/docs">{t("nav.docs")}</Link>
            </Button>
            <div className="hidden items-center gap-2 sm:flex">
              <ThemeToggle />
              <LanguageSwitch />
            </div>
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard/overview">{t("hero.ctaDashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">{t("nav.login")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/register">{t("nav.getStarted")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="from-primary/10 via-background to-highlighter/10 absolute inset-0 -z-10 bg-linear-to-br" />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
          <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {t("hero.eyebrow")}
          </span>
          <h1 className="font-display max-w-2xl text-4xl leading-[1.1] font-medium text-balance sm:text-6xl">
            {t("hero.headline")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-balance">
            {t("hero.subheading")}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Button asChild size="lg">
                <Link href="/dashboard/overview">{t("hero.ctaDashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/auth/register">{t("hero.ctaPrimary")}</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/login">{t("hero.ctaSecondary")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 sm:py-24">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {t("features.eyebrow")}
          </span>
          <h2 className="font-display text-3xl leading-tight font-medium text-balance sm:text-4xl">
            {t("features.title")}
          </h2>
          <p className="text-muted-foreground text-balance">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(FEATURE_ICONS) as (keyof typeof FEATURE_ICONS)[]).map(
            (key) => {
              const Icon = FEATURE_ICONS[key];
              return (
                <div
                  key={key}
                  className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-6"
                >
                  <div className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
                    <Icon className="size-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-display text-xl font-medium">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="text-muted-foreground text-sm text-balance">
                    {t(`features.${key}.description`)}
                  </p>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/60 mt-auto border-t">
        <div className="text-muted-foreground/70 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-xs sm:flex-row">
          <div className="flex items-center gap-2">
            <LessonioMark className="h-4 w-auto" />
            <span>{t("footer.tagline")}</span>
          </div>
          <span>
            © {new Date().getFullYear()} {tApp("name")} · {t("footer.rights")}
          </span>
        </div>
      </footer>
    </div>
  );
}
