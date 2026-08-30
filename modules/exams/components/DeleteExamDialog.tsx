"use client";

import { useTranslations } from "next-intl";

import { deleteExam } from "@/actions/exams.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { ExamWithRelations } from "@/lib/types/exam";

export interface DeleteExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: ExamWithRelations | null;
  onDeleted?: () => void;
}

export function DeleteExamDialog({
  open,
  onOpenChange,
  exam,
  onDeleted,
}: DeleteExamDialogProps) {
  const t = useTranslations("exams.delete");

  if (!exam) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { title: exam.title })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteExam(exam.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
