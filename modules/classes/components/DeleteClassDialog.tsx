"use client";

import { useTranslations } from "next-intl";

import { deleteClass } from "@/actions/classes.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { ClassWithSubject } from "@/lib/types/class";

export interface DeleteClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  klass: ClassWithSubject | null;
  onDeleted?: () => void;
}

export function DeleteClassDialog({
  open,
  onOpenChange,
  klass,
  onDeleted,
}: DeleteClassDialogProps) {
  const t = useTranslations("classes.delete");

  if (!klass) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { name: klass.subjectName })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteClass(klass.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
