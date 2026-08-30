"use client";

import { useTranslations } from "next-intl";

import { deleteGoal } from "@/actions/gamification.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { Goal } from "@/lib/types/goal";

export interface DeleteGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  onDeleted?: () => void;
}

export function DeleteGoalDialog({
  open,
  onOpenChange,
  goal,
  onDeleted,
}: DeleteGoalDialogProps) {
  const t = useTranslations("gamification.goals.delete");
  const tPeriod = useTranslations("gamification.goals");

  if (!goal) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { period: tPeriod(goal.period) })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteGoal(goal.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
