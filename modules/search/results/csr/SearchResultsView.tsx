"use client";

import { EmptyState } from "@/components/ui-system/empty-state";
import {
  SEARCH_RESULT_GROUP_ORDER,
  SearchResultItem,
} from "@/components/ui-system/search-result-item";
import useTranslate from "@/hooks/useTranslate";
import type {
  SearchResultItem as SearchResultItemType,
  SearchResultKind,
} from "@/lib/types/search";

interface SearchResultsViewProps {
  data: SearchResultItemType[];
  query: string;
}

function groupByKind(
  data: SearchResultItemType[],
): Map<SearchResultKind, SearchResultItemType[]> {
  const groups = new Map<SearchResultKind, SearchResultItemType[]>();
  for (const item of data) {
    const existing = groups.get(item.kind) ?? [];
    existing.push(item);
    groups.set(item.kind, existing);
  }
  return groups;
}

export const SearchResultsView = ({ data, query }: SearchResultsViewProps) => {
  const t = useTranslate("search");
  const trimmedQuery = query.trim();
  const groups = groupByKind(data);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("results.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {trimmedQuery
            ? t("results.subtitle", { query: trimmedQuery })
            : t("results.promptDescription")}
        </p>
      </div>

      {!trimmedQuery ? (
        <EmptyState
          variant="no-data"
          title={t("results.promptTitle")}
          description={t("results.promptDescription")}
        />
      ) : data.length === 0 ? (
        <EmptyState
          variant="no-results"
          title={t("results.emptyTitle")}
          description={t("results.emptyDescription", { query: trimmedQuery })}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {SEARCH_RESULT_GROUP_ORDER.filter((kind) => groups.has(kind)).map(
            (kind) => (
              <div key={kind} className="flex flex-col gap-1">
                <h2 className="px-3 text-sm font-medium text-muted-foreground">
                  {t(`groups.${kind}`)}
                </h2>
                <div className="flex flex-col gap-0.5">
                  {groups.get(kind)!.map((item) => (
                    <SearchResultItem
                      key={`${item.kind}-${item.id}`}
                      item={item}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};
