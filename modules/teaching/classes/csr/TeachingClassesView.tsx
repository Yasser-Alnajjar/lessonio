"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { toggleArchivedTeacherClass } from "@/actions/teacher-classes.mutations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import { useRouter } from "@/i18n/navigation";
import type { TeacherClassWithStats } from "@/lib/types/teacher-class";
import { DeleteTeacherClassDialog } from "../../components/DeleteTeacherClassDialog";
import { TeacherClassActionsMenu } from "../../components/TeacherClassActionsMenu";
import { TeacherClassCard } from "../../components/TeacherClassCard";
import { TeacherClassFormDialog } from "../../components/TeacherClassFormDialog";

interface TeachingClassesViewProps {
  classes: TeacherClassWithStats[];
}

interface FormState {
  open: boolean;
  item: TeacherClassWithStats | null;
}

export const TeachingClassesView = ({ classes }: TeachingClassesViewProps) => {
  const t = useTranslations("teaching.classes");
  const router = useRouter();

  const [formState, setFormState] = useState<FormState>({
    open: false,
    item: null,
  });
  const [deleteTarget, setDeleteTarget] =
    useState<TeacherClassWithStats | null>(null);

  const openCreate = () => setFormState({ open: true, item: null });

  const handleToggleArchived = async (item: TeacherClassWithStats) => {
    await toggleArchivedTeacherClass(item.id);
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
        <Button onClick={openCreate}>
          <Plus />
          {t("list.newClass")}
        </Button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          variant="no-data"
          title={t("list.emptyTitle")}
          description={t("list.emptyDescription")}
          action={{ label: t("list.emptyAction"), onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {classes.map((item) => (
            <TeacherClassCard
              key={item.id}
              item={item}
              actions={
                <TeacherClassActionsMenu
                  item={item}
                  onEdit={() => setFormState({ open: true, item })}
                  onToggleArchived={() => handleToggleArchived(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              }
            />
          ))}
        </div>
      )}

      <TeacherClassFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        item={formState.item}
        onSaved={() => router.refresh()}
      />

      <DeleteTeacherClassDialog
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
