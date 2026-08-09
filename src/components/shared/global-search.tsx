"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useLocale } from "next-intl";

import { liveSearch } from "@/actions/search.mutations";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  SEARCH_RESULT_GROUP_ORDER,
  SEARCH_RESULT_ICONS,
} from "@/components/ui-system/search-result-item";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import useTranslate from "@/hooks/useTranslate";
import { useRouter } from "@/i18n/navigation";
import type { SearchResultItem, SearchResultKind } from "@/lib/types/search";

function groupByKind(data: SearchResultItem[]): Map<SearchResultKind, SearchResultItem[]> {
  const groups = new Map<SearchResultKind, SearchResultItem[]>();
  for (const item of data) {
    const existing = groups.get(item.kind) ?? [];
    existing.push(item);
    groups.set(item.kind, existing);
  }
  return groups;
}

/** navigator.platform/userAgent never changes after mount — a no-op subscribe is correct here. */
const subscribeNever = () => () => {};
const getIsMacSnapshot = () => /mac/i.test(navigator.platform || navigator.userAgent);
const getIsMacServerSnapshot = () => false;

export function GlobalSearch() {
  const t = useTranslate("search");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const isMac = React.useSyncExternalStore(
    subscribeNever,
    getIsMacSnapshot,
    getIsMacServerSnapshot,
  );

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const trimmedQuery = debouncedQuery.trim();

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clear the query when the palette closes — adjusting state in response to
  // a prop/state change during render, per React's documented pattern,
  // rather than a useEffect (same trick as GoalFormDialog's `wasOpen`).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setQuery("");
  }

  const { data, isFetching } = useQuery({
    queryKey: ["search", "live", trimmedQuery],
    queryFn: () => liveSearch(trimmedQuery),
    enabled: trimmedQuery.length > 0,
  });

  const results = data?.data ?? [];
  const groups = groupByKind(results);

  const goTo = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t("trigger.label")}
        className="hidden items-center gap-2 text-muted-foreground sm:flex"
      >
        <SearchIcon className="size-4" />
        <span className="hidden lg:inline">{t("trigger.label")}</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-xs lg:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t("trigger.label")}
        className="sm:hidden"
      >
        <SearchIcon className="size-4" />
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("trigger.label")}
        description={t("palette.placeholder")}
        shouldFilter={false}
      >
        <div dir={isArabic ? "rtl" : "ltr"}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("palette.placeholder")}
          />
          <CommandList>
            {trimmedQuery.length === 0 ? (
              <CommandEmpty>{t("palette.prompt")}</CommandEmpty>
            ) : !isFetching && results.length === 0 ? (
              <CommandEmpty>{t("palette.empty", { query: trimmedQuery })}</CommandEmpty>
            ) : (
              SEARCH_RESULT_GROUP_ORDER.filter((kind) => groups.has(kind)).map((kind) => {
                const Icon = SEARCH_RESULT_ICONS[kind];
                return (
                  <CommandGroup key={kind} heading={t(`groups.${kind}`)}>
                    {groups.get(kind)!.map((item) => (
                      <CommandItem
                        key={`${item.kind}-${item.id}`}
                        value={`${item.kind}-${item.id}`}
                        onSelect={() => goTo(item.path)}
                      >
                        <Icon />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{item.title}</span>
                          {item.subtitle && (
                            <span className="truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            )}

            {trimmedQuery.length > 0 && (
              <CommandGroup>
                <CommandItem
                  value="view-all-results"
                  onSelect={() => goTo(`/search/results?q=${encodeURIComponent(trimmedQuery)}`)}
                >
                  <SearchIcon />
                  {t("palette.viewAll", { query: trimmedQuery })}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}
