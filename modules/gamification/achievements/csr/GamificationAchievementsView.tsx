"use client";

import { format, parseISO } from "date-fns";
import { HelpCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui-system/empty-state";
import useTranslate from "@/hooks/useTranslate";
import {
  ACHIEVEMENT_I18N_KEYS,
  ACHIEVEMENT_ICON_COMPONENTS,
} from "@/lib/constants/gamification";
import { cn } from "@/lib/utils";
import type { Achievement } from "@/lib/types/achievement";

interface GamificationAchievementsViewProps {
  data: Achievement[];
}

export const GamificationAchievementsView = ({
  data,
}: GamificationAchievementsViewProps) => {
  const t = useTranslate("gamification.achievements");

  if (data.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((achievement) => {
          const Icon =
            ACHIEVEMENT_ICON_COMPONENTS[achievement.icon] ?? HelpCircle;
          const i18nKey = ACHIEVEMENT_I18N_KEYS[achievement.key];
          const title = i18nKey
            ? t(`items.${i18nKey}.title`)
            : achievement.title;
          const description = i18nKey
            ? t(`items.${i18nKey}.description`)
            : achievement.description;
          const unlocked = Boolean(achievement.unlockedAt);

          return (
            <Card
              key={achievement.id}
              data-slot="achievement-card"
              className={cn(
                !unlocked && "opacity-60 grayscale dark:grayscale-50",
              )}
            >
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <span
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground",
                    unlocked && "bg-highlighter/15 text-highlighter",
                  )}
                >
                  <Icon className="size-7" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {description}
                  </span>
                </div>

                {unlocked && achievement.unlockedAt ? (
                  <span className="text-xs font-medium text-highlighter">
                    {t("unlockedOn", {
                      date: format(
                        parseISO(achievement.unlockedAt),
                        "MMM d, yyyy",
                      ),
                    })}
                  </span>
                ) : (
                  <div className="flex w-full flex-col gap-1">
                    <Progress value={achievement.progress} className="h-1.5" />
                    <span className="text-xs text-muted-foreground">
                      {t("progressLabel", { progress: achievement.progress })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
