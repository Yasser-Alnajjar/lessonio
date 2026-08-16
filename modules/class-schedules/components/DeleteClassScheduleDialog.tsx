"use client";

import { useTranslations } from "next-intl";

import { deleteClassSchedule } from "@/actions/class-schedules.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { ClassScheduleWithSubject } from "@/lib/types/class-schedule";

export interface DeleteClassScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSchedule: ClassScheduleWithSubject | null;
  onDeleted?: () => void;
}

export function DeleteClassScheduleDialog({
  open,
  onOpenChange,
  classSchedule,
  onDeleted,
}: DeleteClassScheduleDialogProps) {
  const t = useTranslations("classSchedules.delete");

  if (!classSchedule) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { name: classSchedule.subjectName })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteClassSchedule(classSchedule.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
