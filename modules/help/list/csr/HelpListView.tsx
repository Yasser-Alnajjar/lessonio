"use client";

import { useMemo, useState } from "react";
import { BookMarked, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui-system/callout";
import { SearchInput } from "@/components/ui-system/search-input";
import { Link } from "@/i18n/navigation";
import {
  HELP_SECTIONS,
  HELP_TOPICS,
  getTopicsBySection,
  type HelpSection,
} from "@/lib/help/content";
import { HelpFlowDiagram } from "../../components/HelpFlowDiagram";
import { TopicCard } from "../../components/TopicCard";

export interface HelpListViewProps {
  isNewUser: boolean;
}

export const HelpListView = ({ isNewUser }: HelpListViewProps) => {
  const t = useTranslations("help");
  const [query, setQuery] = useState("");

  const flowSteps = t.raw("home.flow.steps") as string[];

  const matchingSlugs = useMemo(() => {
    if (!query.trim()) return null;
    const needle = query.trim().toLowerCase();

    return new Set(
      HELP_TOPICS.filter((topic) => {
        const title = t(`topics.${topic.slug}.title`).toLowerCase();
        const summary = t(`topics.${topic.slug}.summary`).toLowerCase();
        return title.includes(needle) || summary.includes(needle);
      }).map((topic) => topic.slug),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const sectionsToRender: HelpSection[] = matchingSlugs
    ? HELP_SECTIONS.filter((section) =>
        getTopicsBySection(section).some((topic) =>
          matchingSlugs.has(topic.slug),
        ),
      )
    : HELP_SECTIONS;

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium">{t("home.title")}</h1>
        <p className="text-muted-foreground max-w-2xl text-balance">
          {t("home.subtitle")}
        </p>
      </div>

      <SearchInput
        onSearch={setQuery}
        placeholder={t("home.searchPlaceholder")}
        containerClassName="max-w-md"
      />

      {isNewUser && !matchingSlugs && (
        <Callout variant="tip" title={t("home.continueSetup.title")}>
          <p>{t("home.continueSetup.description")}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/help/detail/first-steps">
              <Rocket />
              {t("home.continueSetup.cta")}
            </Link>
          </Button>
        </Callout>
      )}

      {!matchingSlugs && (
        <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
          <div>
            <h2 className="font-display text-lg font-medium">
              {t("home.flow.title")}
            </h2>
          </div>
          <div className="mx-auto w-full max-w-fit">
            <HelpFlowDiagram steps={flowSteps} />
          </div>
        </div>
      )}

      {sectionsToRender.map((section) => {
        const topics = getTopicsBySection(section).filter(
          (topic) => !matchingSlugs || matchingSlugs.has(topic.slug),
        );
        if (topics.length === 0) return null;

        return (
          <div key={section} className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-lg font-medium">
                {t(`sections.${section}.title`)}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t(`sections.${section}.description`)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => (
                <TopicCard
                  key={topic.slug}
                  href={`/help/detail/${topic.slug}`}
                  icon={topic.icon}
                  title={t(`topics.${topic.slug}.title`)}
                  summary={t(`topics.${topic.slug}.summary`)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <Link
        href="/help/glossary"
        className="border-border bg-card hover:bg-accent/40 flex items-center gap-3 rounded-2xl border p-5 transition-colors"
      >
        <div className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-full">
          <BookMarked className="size-4.5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-base font-medium">
            {t("glossary.title")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t("glossary.subtitle")}
          </p>
        </div>
      </Link>
    </div>
  );
};
