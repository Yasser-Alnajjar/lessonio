"use client";

import { useTranslations } from "next-intl";

import { deleteLesson } from "@/actions/lessons.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { LessonWithRelations } from "@/lib/types/lesson";

export interface DeleteLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonWithRelations | null;
  onDeleted?: () => void;
}

export function DeleteLessonDialog({
  open,
  onOpenChange,
  lesson,
  onDeleted,
}: DeleteLessonDialogProps) {
  const t = useTranslations("lessons.delete");

  if (!lesson) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { title: lesson.title })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteLesson(lesson.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
