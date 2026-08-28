import type { Metadata } from "next";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  NotebookText,
  Search,
  Settings,
  Timer,
  Trophy,
  WifiOff,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Actions } from "@/actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

const FEATURE_ICONS = {
  subjects: BookOpen,
  lessons: NotebookText,
  homework: ClipboardList,
  exams: GraduationCap,
  calendar: CalendarDays,
  studySessions: Timer,
  statistics: BarChart3,
  gamification: Trophy,
  notifications: Bell,
  search: Search,
  settings: Settings,
  offline: WifiOff,
} as const;

const FAQ_KEYS = ["privacy", "free", "offline", "languages"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.meta");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function DocsPage() {
  const t = await getTranslations("docs");
  const { data: user } = await Actions.Auth.getSession();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="from-primary/10 via-background to-highlighter/10 absolute inset-0 -z-10 bg-linear-to-br" />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {t("hero.eyebrow")}
          </span>
          <h1 className="font-display max-w-2xl text-4xl leading-[1.1] font-medium text-balance sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-balance">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Getting started */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 sm:py-20">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
          <h2 className="font-display text-3xl leading-tight font-medium text-balance sm:text-4xl">
            {t("gettingStarted.title")}
          </h2>
          <p className="text-muted-foreground text-balance">
            {t("gettingStarted.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((step, index) => (
            <div
              key={step}
              className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-6"
            >
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </div>
              <h3 className="font-display text-lg font-medium">
                {t(`gettingStarted.steps.${step}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm text-balance">
                {t(`gettingStarted.steps.${step}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-border/60 border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 sm:py-20">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
            <h2 className="font-display text-3xl leading-tight font-medium text-balance sm:text-4xl">
              {t("features.title")}
            </h2>
            <p className="text-muted-foreground text-balance">
              {t("features.subtitle")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16 sm:py-20">
        <h2 className="font-display text-center text-3xl leading-tight font-medium text-balance sm:text-4xl">
          {t("faq.title")}
        </h2>

        <dl className="flex flex-col">
          {FAQ_KEYS.map((key) => (
            <div
              key={key}
              className="border-border/60 border-t py-6 first:border-t-0"
            >
              <dt className="font-medium">{t(`faq.items.${key}.question`)}</dt>
              <dd className="text-muted-foreground mt-2 text-sm text-balance">
                {t(`faq.items.${key}.answer`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* CTA */}
      <section className="border-border/60 border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
          <h2 className="font-display text-3xl leading-tight font-medium text-balance sm:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="text-muted-foreground max-w-xl text-balance">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Button asChild size="lg">
                <Link href="/dashboard/overview">
                  {t("cta.go_to_dashboard")}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/auth/register">{t("cta.primary")}</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/login">{t("cta.secondary")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
