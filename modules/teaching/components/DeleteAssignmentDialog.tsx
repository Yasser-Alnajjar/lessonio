"use client";

import { useTranslations } from "next-intl";

import { deleteAssignment } from "@/actions/assignments.mutations";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import type { AssignmentWithStats } from "@/lib/types/assignment";

export interface DeleteAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AssignmentWithStats | null;
  onDeleted?: () => void;
}

export function DeleteAssignmentDialog({
  open,
  onOpenChange,
  item,
  onDeleted,
}: DeleteAssignmentDialogProps) {
  const t = useTranslations("teaching.assignments.delete");

  if (!item) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description", { title: item.title })}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      variant="destructive"
      onConfirm={async () => {
        const result = await deleteAssignment(item.id);
        if (!result.success) {
          throw new Error(result.error || t("genericError"));
        }
        onDeleted?.();
      }}
    />
  );
}
