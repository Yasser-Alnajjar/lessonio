"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  publishAssignment,
  unpublishAssignment,
} from "@/actions/assignments.mutations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import { useRouter } from "@/i18n/navigation";
import type { AssignmentWithStats } from "@/lib/types/assignment";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";
import { AssignmentFormDialog } from "../../components/AssignmentFormDialog";
import { DeleteAssignmentDialog } from "../../components/DeleteAssignmentDialog";
import { TeacherAssignmentActionsMenu } from "../../components/TeacherAssignmentActionsMenu";
import { TeacherAssignmentCard } from "../../components/TeacherAssignmentCard";

interface TeachingAssignmentsViewProps {
  assignments: AssignmentWithStats[];
  classes: TeacherClassWithStats[];
}

interface FormState {
  open: boolean;
  item: AssignmentWithStats | null;
}

export const TeachingAssignmentsView = ({
  assignments,
  classes,
}: TeachingAssignmentsViewProps) => {
  const t = useTranslations("teaching.assignments");
  const router = useRouter();

  const [formState, setFormState] = useState<FormState>({
    open: false,
    item: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<AssignmentWithStats | null>(
    null,
  );

  const openCreate = () => setFormState({ open: true, item: null });

  const handleTogglePublished = async (item: AssignmentWithStats) => {
    if (item.status === "published") {
      await unpublishAssignment(item.id);
    } else {
      await publishAssignment(item.id);
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("list.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <Button onClick={openCreate} disabled={classes.length === 0}>
          <Plus />
          {t("list.newAssignment")}
        </Button>
      </div>

      {classes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("list.noClassesHint")}
        </p>
      )}

      {assignments.length === 0 ? (
        <EmptyState
          variant="no-data"
          title={t("list.emptyTitle")}
          description={t("list.emptyDescription")}
          action={
            classes.length > 0
              ? { label: t("list.emptyAction"), onClick: openCreate }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assignments.map((item) => (
            <TeacherAssignmentCard
              key={item.id}
              item={item}
              actions={
                <TeacherAssignmentActionsMenu
                  item={item}
                  onEdit={() => setFormState({ open: true, item })}
                  onTogglePublished={() => handleTogglePublished(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              }
            />
          ))}
        </div>
      )}

      <AssignmentFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        item={formState.item}
        classes={classes}
        onSaved={() => router.refresh()}
      />

      <DeleteAssignmentDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        item={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
