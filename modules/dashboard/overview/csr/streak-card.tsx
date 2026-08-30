"use client";

import { Flame } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import useTranslate from "@/hooks/useTranslate";

interface StreakCardProps {
  currentStreakDays: number;
  longestStreakDays: number;
}

export function StreakCard({
  currentStreakDays,
  longestStreakDays,
}: StreakCardProps) {
  const t = useTranslate("dashboard.streak");
  const isActive = currentStreakDays > 0;

  return (
    <Card data-slot="streak-card" className="gap-2">
      <CardContent className="flex items-center gap-4 pt-6">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground",
            isActive && "bg-highlighter/15 text-highlighter",
          )}
        >
          <Flame className="size-6" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {currentStreakDays}
          </span>
          <span className="text-xs text-muted-foreground">{t("label")}</span>
          <span className="text-xs text-muted-foreground/70">
            {isActive || longestStreakDays > 0
              ? t("longest", { days: longestStreakDays })
              : t("empty")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
