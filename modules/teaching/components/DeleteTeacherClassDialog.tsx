"use client";

import { useTranslations } from "next-intl";

import { deleteTeacherClass } from "@/actions/teacher-classes.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";

export interface DeleteTeacherClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TeacherClassWithStats | null;
  onDeleted?: () => void;
}

export function DeleteTeacherClassDialog({
  open,
  onOpenChange,
  item,
  onDeleted,
}: DeleteTeacherClassDialogProps) {
  const t = useTranslations("teaching.classes.delete");

  if (!item) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { name: item.name })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteTeacherClass(item.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
