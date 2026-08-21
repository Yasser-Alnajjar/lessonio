"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { EmptyState } from "@/components/ui-system/empty-state";
import { SearchInput } from "@/components/ui-system/search-input";
import { Link } from "@/i18n/navigation";
import { GLOSSARY_RELATIONS, GLOSSARY_TERMS } from "@/lib/help/glossary";

export const HelpGlossaryView = () => {
  const t = useTranslations("help");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const [query, setQuery] = useState("");

  const terms = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return GLOSSARY_TERMS;

    return GLOSSARY_TERMS.filter((term) => {
      const name = t(`glossary.terms.${term}.name`).toLowerCase();
      const explanation = t(`glossary.terms.${term}.explanation`).toLowerCase();
      return name.includes(needle) || explanation.includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <Link
        href="/help/list"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
      >
        <BackIcon className="size-4" />
        {t("ui.backToHelp")}
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-medium">
          {t("glossary.title")}
        </h1>
        <p className="text-muted-foreground text-balance">
          {t("glossary.subtitle")}
        </p>
      </div>

      <SearchInput
        onSearch={setQuery}
        placeholder={t("glossary.searchPlaceholder")}
      />

      {terms.length === 0 ? (
        <EmptyState variant="no-results" title={t("glossary.noResults")} />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {terms.map((term) => (
            <div key={term} id={term} className="flex flex-col gap-2 py-5 first:pt-0">
              <h2 className="text-base font-semibold">
                {t(`glossary.terms.${term}.name`)}
              </h2>
              <p className="text-balance">{t(`glossary.terms.${term}.explanation`)}</p>
              <p className="text-muted-foreground text-sm text-balance">
                {t(`glossary.terms.${term}.example`)}
              </p>
              {GLOSSARY_RELATIONS[term].length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {GLOSSARY_RELATIONS[term].map((related) => (
                    <a
                      key={related}
                      href={`#${related}`}
                      className="border-border bg-card hover:bg-accent rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                    >
                      {t(`glossary.terms.${related}.name`)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
