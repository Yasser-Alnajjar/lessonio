"use client";

import { Award, CheckCircle2, ClipboardCheck, StickyNote } from "lucide-react";
import { useLocale } from "next-intl";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import { cn } from "@/lib/utils";
import useTranslate from "@/hooks/useTranslate";
import type { RecentActivityItem } from "@/lib/types/dashboard";
import { useState } from "react";

interface RecentActivityCardProps {
  items: RecentActivityItem[];
}

const KIND_ICON: Record<
  RecentActivityItem["kind"],
  React.ComponentType<{ className?: string }>
> = {
  lesson_completed: CheckCircle2,
  note_added: StickyNote,
  homework_done: ClipboardCheck,
  exam_scored: Award,
};

function relativeTime(iso: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffMinutes = Math.round(
    (new Date(iso).getTime() - Date.now()) / 60_000,
  );

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  return rtf.format(Math.round(diffHours / 24), "day");
}

function ActivityList({
  items,
  locale,
  t,
}: {
  items: RecentActivityItem[];
  locale: string;
  t: ReturnType<typeof useTranslate>;
}) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, index) => {
        const Icon = KIND_ICON[item.kind];

        return (
          <li key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-4" />
              </span>

              {index < items.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
              )}
            </div>

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col pb-1",
                index === items.length - 1 && "pb-0",
              )}
            >
              <p className="truncate text-sm text-foreground">
                <span className="text-muted-foreground">
                  {t(`kinds.${item.kind}`)}
                </span>{" "}
                {item.label}
              </p>

              <span className="text-xs text-muted-foreground/70">
                {relativeTime(item.occurredAt, locale)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RecentActivityCard({ items }: RecentActivityCardProps) {
  const t = useTranslate("dashboard.recentActivity");
  const locale = useLocale();

  const [open, setOpen] = useState(false);

  const recentItems = items.slice(0, 4);
  const hasMore = items.length > 4;

  return (
    <>
      <Card data-slot="recent-activity-card" className="gap-4">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t("title")}</CardTitle>
        </CardHeader>

        <CardContent>
          {recentItems.length === 0 ? (
            <EmptyState
              variant="no-data"
              title={t("empty")}
              className="min-h-40 p-6"
            />
          ) : (
            <div className="flex flex-col gap-4">
              <ActivityList items={recentItems} locale={locale} t={t} />

              {hasMore && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setOpen(true)}
                >
                  {t("seeMore")}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <ActivityList items={items} locale={locale} t={t} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
