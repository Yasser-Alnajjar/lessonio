"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { toggleActiveClassSchedule } from "@/actions/class-schedules.mutations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import { useRouter } from "@/i18n/navigation";
import type { ClassScheduleWithSubject } from "@/lib/types/class-schedule";
import type { Subject } from "@/lib/types/subject";
import { ClassScheduleActionsMenu } from "../../components/ClassScheduleActionsMenu";
import { ClassScheduleCard } from "../../components/ClassScheduleCard";
import { ClassScheduleFormDialog } from "../../components/ClassScheduleFormDialog";
import { DeleteClassScheduleDialog } from "../../components/DeleteClassScheduleDialog";
import useTranslate from "@/hooks/useTranslate";

interface ClassSchedulesListViewProps {
  data: ClassScheduleWithSubject[];
  subjects: Subject[];
}

interface FormState {
  open: boolean;
  classSchedule: ClassScheduleWithSubject | null;
}

export const ClassSchedulesListView = ({
  data,
  subjects,
}: ClassSchedulesListViewProps) => {
  const t = useTranslate("classSchedules");
  const router = useRouter();

  const [formState, setFormState] = useState<FormState>({
    open: false,
    classSchedule: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<ClassScheduleWithSubject | null>(
    null,
  );

  const handleToggleActive = async (classSchedule: ClassScheduleWithSubject) => {
    await toggleActiveClassSchedule(classSchedule.id);
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
        <Button
          onClick={() => setFormState({ open: true, classSchedule: null })}
          disabled={subjects.length === 0}
        >
          <Plus />
          {t("list.newClass")}
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title={t("list.noSubjectsTitle")}
          description={t("list.noSubjectsDescription")}
        />
      ) : data.length === 0 ? (
        <EmptyState
          title={t("list.emptyTitle")}
          description={t("list.emptyDescription")}
          action={{
            label: t("list.emptyAction"),
            onClick: () => setFormState({ open: true, classSchedule: null }),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((classSchedule) => (
            <ClassScheduleCard
              key={classSchedule.id}
              classSchedule={classSchedule}
              actions={
                <ClassScheduleActionsMenu
                  classSchedule={classSchedule}
                  onEdit={() => setFormState({ open: true, classSchedule })}
                  onToggleActive={() => handleToggleActive(classSchedule)}
                  onDelete={() => setDeleteTarget(classSchedule)}
                />
              }
            />
          ))}
        </div>
      )}

      <ClassScheduleFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        classSchedule={formState.classSchedule}
        subjects={subjects}
        onSaved={() => router.refresh()}
      />

      <DeleteClassScheduleDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        classSchedule={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
