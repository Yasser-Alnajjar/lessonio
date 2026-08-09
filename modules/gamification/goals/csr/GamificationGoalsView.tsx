"use client";

import { useMemo, useState } from "react";
import { startOfMonth, startOfWeek, format } from "date-fns";
import { Plus, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { Ring } from "@/components/ui-system/ring";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import type { Goal, GoalPeriod } from "@/lib/types/goal";
import { DeleteGoalDialog } from "../../components/DeleteGoalDialog";
import { GoalFormDialog } from "../../components/GoalFormDialog";

interface GamificationGoalsViewProps {
  data: Goal[];
}

interface FormState {
  open: boolean;
  goal: Goal | null;
  period: GoalPeriod;
}

function currentPeriodStart(period: GoalPeriod): string {
  const today = new Date();
  const start = period === "weekly" ? startOfWeek(today, { weekStartsOn: 1 }) : startOfMonth(today);
  return format(start, "yyyy-MM-dd");
}

export const GamificationGoalsView = ({ data }: GamificationGoalsViewProps) => {
  const t = useTranslate("gamification.goals");
  const router = useRouter();

  const [formState, setFormState] = useState<FormState>({
    open: false,
    goal: null,
    period: "weekly",
  });
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);

  const { currentGoals, pastGoals } = useMemo(() => {
    const currentByPeriod = new Map<GoalPeriod, Goal>();
    const past: Goal[] = [];

    for (const goal of data) {
      if (
        goal.periodStart === currentPeriodStart(goal.period) &&
        !currentByPeriod.has(goal.period)
      ) {
        currentByPeriod.set(goal.period, goal);
      } else {
        past.push(goal);
      }
    }

    return { currentGoals: currentByPeriod, pastGoals: past };
  }, [data]);

  const renderCurrentCard = (period: GoalPeriod) => {
    const goal = currentGoals.get(period);
    const periodLabel = t(period);

    if (!goal) {
      return (
        <Card key={period} data-slot="goal-card">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Target className="size-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{periodLabel}</p>
              <p className="text-xs text-muted-foreground">{t("noGoalDescription")}</p>
            </div>
            <Button size="sm" onClick={() => setFormState({ open: true, goal: null, period })}>
              <Plus />
              {t("setGoal")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    const percent =
      goal.targetMinutes > 0 ? Math.round((goal.achievedMinutes / goal.targetMinutes) * 100) : 0;

    return (
      <Card key={period} data-slot="goal-card">
        <CardContent className="flex items-center gap-4 pt-6">
          <Ring value={percent} size="lg" />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
            <span className="text-sm font-medium text-foreground">
              {t("achievedOfTarget", { achieved: goal.achievedMinutes, target: goal.targetMinutes })}
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto w-fit p-0 text-xs"
              onClick={() => setFormState({ open: true, goal, period })}
            >
              {t("form.editTitle")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("currentPeriod")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {renderCurrentCard("weekly")}
          {renderCurrentCard("monthly")}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">{t("pastGoals")}</h2>
        {pastGoals.length === 0 ? (
          <EmptyState variant="no-data" title={t("noPastGoals")} className="min-h-32" />
        ) : (
          <div className="flex flex-col gap-2">
            {pastGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{t(goal.period)}</Badge>
                  <span className="text-sm text-muted-foreground">{goal.periodStart}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">
                    {t("achievedOfTarget", {
                      achieved: goal.achievedMinutes,
                      target: goal.targetMinutes,
                    })}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(goal)}>
                    {t("deleteAction")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <GoalFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        goal={formState.goal}
        defaultPeriod={formState.period}
        onSaved={() => router.refresh()}
      />

      <DeleteGoalDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        goal={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
