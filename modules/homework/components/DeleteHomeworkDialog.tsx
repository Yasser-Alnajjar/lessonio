"use client";

import { useTranslations } from "next-intl";

import { deleteHomework } from "@/actions/homework.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { HomeworkWithRelations } from "@/lib/types/homework";

export interface DeleteHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework: HomeworkWithRelations | null;
  onDeleted?: () => void;
}

export function DeleteHomeworkDialog({
  open,
  onOpenChange,
  homework,
  onDeleted,
}: DeleteHomeworkDialogProps) {
  const t = useTranslations("homework.delete");

  if (!homework) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { title: homework.title })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteHomework(homework.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
