"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ring } from "@/components/ui-system/ring";
import useTranslate from "@/hooks/useTranslate";

interface ProgressCardProps {
  percent: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export function ProgressCard({ percent, level, xp, xpToNextLevel }: ProgressCardProps) {
  const t = useTranslate("dashboard.progress");

  return (
    <Card data-slot="progress-card" className="gap-2">
      <CardContent className="flex items-center gap-4 pt-6">
        <Ring value={percent} size="lg" />
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t("title")}</span>
          <Badge variant="secondary" className="w-fit">
            {t("level", { level })}
          </Badge>
          <span className="text-xs text-muted-foreground/70">
            {t("xpToNext", { xp, xpToNext: xpToNextLevel })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
