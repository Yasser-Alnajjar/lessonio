"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  HOW_IT_WORKS_CONCEPTS,
  getHelpTopic,
  getRelatedTopics,
  type HelpStatusGroup,
} from "@/lib/help/content";
import { HELP_STATUS_VALUES } from "@/lib/help/statuses";
import { ConceptCard } from "../../components/ConceptCard";
import { FaqAccordion, type FaqItem } from "../../components/FaqAccordion";
import { HelpFlowDiagram } from "../../components/HelpFlowDiagram";
import { RelatedTopics } from "../../components/RelatedTopics";
import { StatusExplainerCard } from "../../components/StatusExplainerCard";
import { StepList } from "../../components/StepList";

export interface HelpDetailViewProps {
  slug: string;
}

function StatusGroupSection({ group }: { group: HelpStatusGroup }) {
  const t = useTranslations("help.statuses");
  const values = HELP_STATUS_VALUES[group];

  return (
    <StatusExplainerCard
      groupLabel={t(`${group}.label`)}
      values={values.map((value) => ({
        value,
        label: t(`${group}.values.${value}.label`),
        meaning: t(`${group}.values.${value}.meaning`),
        whenToUse: t(`${group}.values.${value}.whenToUse`),
        effect: t(`${group}.values.${value}.effect`),
        reversible: t(`${group}.values.${value}.reversible`),
      }))}
    />
  );
}

export const HelpDetailView = ({ slug }: HelpDetailViewProps) => {
  const t = useTranslations("help");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const topic = getHelpTopic(slug);
  if (!topic) return null;

  const related = getRelatedTopics(topic);
  const Icon = topic.icon;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4">
      <Link
        href="/help/list"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <BackIcon className="size-4" />
        {t("ui.backToHelp")}
      </Link>

      <div className="flex items-start gap-3">
        <div className="bg-accent text-accent-foreground flex size-11 shrink-0 items-center justify-center rounded-full">
          <Icon className="size-5" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-medium">
            {t(`topics.${slug}.title`)}
          </h1>
          <p className="text-muted-foreground text-balance">
            {t(`topics.${slug}.summary`)}
          </p>
        </div>
      </div>

      {topic.type === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {(t.raw(`topics.${slug}.intro`) as string[]).map((paragraph) => (
              <p key={paragraph} className="text-balance">
                {paragraph}
              </p>
            ))}
          </div>

          {slug === "how-it-works" && (
            <>
              <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
                <h2 className="font-display text-lg font-medium">
                  {t("home.flow.title")}
                </h2>
                <div className="mx-auto w-full max-w-fit">
                  <HelpFlowDiagram
                    steps={t.raw("home.flow.steps") as string[]}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="font-display text-lg font-medium">
                  {t("ui.mainConcepts")}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {HOW_IT_WORKS_CONCEPTS.map((term) => (
                    <ConceptCard
                      key={term}
                      title={t(`glossary.terms.${term}.name`)}
                      description={t(`glossary.terms.${term}.explanation`)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {topic.type === "feature" && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold">{t("ui.whatIsIt")}</h2>
              <p className="text-muted-foreground text-sm text-balance">
                {t(`topics.${slug}.whatIsIt`)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold">{t("ui.whyUseIt")}</h2>
              <p className="text-muted-foreground text-sm text-balance">
                {t(`topics.${slug}.whyUseIt`)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold">{t("ui.whenToUse")}</h2>
              <p className="text-muted-foreground text-sm text-balance">
                {t(`topics.${slug}.whenToUse`)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-semibold">
                {t("ui.whatHappensAfter")}
              </h2>
              <p className="text-muted-foreground text-sm text-balance">
                {t(`topics.${slug}.afterEffect`)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">{t("ui.howToUseIt")}</h2>
            <StepList steps={t.raw(`topics.${slug}.how`) as string[]} />
          </div>

          {topic.statusGroups?.map((group) => (
            <StatusGroupSection key={group} group={group} />
          ))}

          <div className="border-border bg-muted/30 flex flex-col gap-1.5 rounded-xl border p-4">
            <h2 className="text-sm font-semibold">{t("ui.howItConnects")}</h2>
            <p className="text-muted-foreground text-sm text-balance">
              {t(`topics.${slug}.connections`)}
            </p>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="learn-more">
              <AccordionTrigger>{t("ui.learnMore")}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-balance">
                {t(`topics.${slug}.learnMore`)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {topic.relatedFeatureHref && (
            <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
              <p className="text-sm font-medium">{t("ui.readyToDoThis")}</p>
              <Button asChild size="sm">
                <Link href={topic.relatedFeatureHref}>
                  {t(`topics.${slug}.cta`)}
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {topic.type === "journey" && (
        <div className="flex flex-col gap-6">
          <p className="text-balance">{t(`topics.${slug}.scenario`)}</p>
          <StepList steps={t.raw(`topics.${slug}.steps`) as string[]} />
        </div>
      )}

      {topic.type === "faq" && (
        <FaqAccordion items={t.raw(`topics.${slug}.faq`) as FaqItem[]} />
      )}

      <RelatedTopics
        label={t("ui.relatedTopics")}
        topics={related.map((r) => ({
          slug: r.slug,
          title: t(`topics.${r.slug}.title`),
          icon: r.icon,
        }))}
      />
    </div>
  );
};
