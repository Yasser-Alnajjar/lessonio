"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { updateSubject } from "@/actions/subjects.mutations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import { SubjectCard } from "@/components/ui-system/subject-card";
import { useRouter } from "@/i18n/navigation";
import type { Subject, SubjectWithStats } from "@/lib/types/subject";
import { DeleteSubjectDialog } from "../../components/DeleteSubjectDialog";
import { SubjectActionsMenu } from "../../components/SubjectActionsMenu";
import { SubjectFormDialog } from "../../components/SubjectFormDialog";
import useTranslate from "@/hooks/useTranslate";

interface SubjectsListViewProps {
  data: SubjectWithStats[];
}

interface FormState {
  open: boolean;
  subject: Subject | null;
}

export const SubjectsListView = ({ data }: SubjectsListViewProps) => {
  const t = useTranslate("subjects");
  const router = useRouter();

  const [formState, setFormState] = useState<FormState>({
    open: false,
    subject: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeSubjects = useMemo(
    () => data.filter((subject) => !subject.isArchived),
    [data],
  );
  const archivedSubjects = useMemo(
    () => data.filter((subject) => subject.isArchived),
    [data],
  );

  const handleToggleArchive = async (subject: Subject) => {
    await updateSubject(subject.id, { isArchived: !subject.isArchived });
    router.refresh();
  };

  const renderCard = (subject: SubjectWithStats) => (
    <SubjectCard
      key={subject.id}
      subject={subject}
      href={`/subjects/detail/${subject.id}`}
      progressLabel={t("card.progressLabel")}
      archivedLabel={t("card.archivedBadge")}
      actions={
        <SubjectActionsMenu
          subject={subject}
          onEdit={() => setFormState({ open: true, subject })}
          onToggleArchive={() => handleToggleArchive(subject)}
          onDelete={() => setDeleteTarget(subject)}
        />
      }
    />
  );

  const isEmpty = activeSubjects.length === 0 && archivedSubjects.length === 0;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("list.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <Button onClick={() => setFormState({ open: true, subject: null })}>
          <Plus />
          {t("list.newSubject")}
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          title={t("list.emptyTitle")}
          description={t("list.emptyDescription")}
          action={{
            label: t("list.emptyAction"),
            onClick: () => setFormState({ open: true, subject: null }),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeSubjects.map(renderCard)}
        </div>
      )}

      {archivedSubjects.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            onClick={() => setShowArchived((prev) => !prev)}
          >
            {showArchived ? t("list.hideArchived") : t("list.showArchived")} (
            {archivedSubjects.length})
          </Button>
          {showArchived && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {archivedSubjects.map(renderCard)}
            </div>
          )}
        </div>
      )}

      <SubjectFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        subject={formState.subject}
        onSaved={() => router.refresh()}
      />

      <DeleteSubjectDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        subject={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
