"use client";

import { useTranslations } from "next-intl";

import { deleteSubject } from "@/actions/subjects.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { Subject } from "@/lib/types/subject";

export interface DeleteSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onDeleted?: () => void;
}

export function DeleteSubjectDialog({
  open,
  onOpenChange,
  subject,
  onDeleted,
}: DeleteSubjectDialogProps) {
  const t = useTranslations("subjects.delete");

  if (!subject) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { name: subject.name })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteSubject(subject.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
