"use client";

import { useMemo, useState } from "react";

import { deleteStudySession } from "@/actions/study-sessions.mutations";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import { EmptyState } from "@/components/ui-system/empty-state";
import {
  EMPTY_FILTER_VALUE,
  FilterSidebar,
  type FilterSidebarValue,
} from "@/components/ui-system/filter-sidebar";
import { SearchInput } from "@/components/ui-system/search-input";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { StudySessionWithRelations } from "@/lib/types/study-session";
import type { Subject } from "@/lib/types/subject";
import { LogSessionDialog } from "../../components/LogSessionDialog";
import { SessionCard } from "../../components/SessionCard";
import { Plus } from "lucide-react";

interface StudySessionsHistoryViewProps {
  data: StudySessionWithRelations[];
  subjects: Subject[];
  lessons: LessonWithRelations[];
}

export const StudySessionsHistoryView = ({
  data,
  subjects,
  lessons,
}: StudySessionsHistoryViewProps) => {
  const t = useTranslate("studySessions.history");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterSidebarValue>(EMPTY_FILTER_VALUE);

  const [logOpen, setLogOpen] = useState(false);

  const [editingSession, setEditingSession] =
    useState<StudySessionWithRelations | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<StudySessionWithRelations | null>(null);

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.name,
    color: subject.color,
  }));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((session) => {
      if (
        query &&
        !(session.subjectName ?? "").toLowerCase().includes(query) &&
        !(session.lessonTitle ?? "").toLowerCase().includes(query)
      ) {
        return false;
      }

      if (
        filter.subjectIds.length > 0 &&
        (!session.subjectId || !filter.subjectIds.includes(session.subjectId))
      ) {
        return false;
      }

      const dateKey = session.startedAt.slice(0, 10);

      if (filter.dateFrom && dateKey < filter.dateFrom) {
        return false;
      }

      if (filter.dateTo && dateKey > filter.dateTo) {
        return false;
      }

      return true;
    });
  }, [data, search, filter]);

  const handleCreate = () => {
    setEditingSession(null);
    setLogOpen(true);
  };

  const handleEdit = (session: StudySessionWithRelations) => {
    setEditingSession(session);
    setLogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setLogOpen(open);

    if (!open) {
      setEditingSession(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("title")}
          </h1>

          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Button onClick={handleCreate}>
          <Plus />
          {t("logSession")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          onSearch={setSearch}
          placeholder={t("searchPlaceholder")}
          containerClassName="min-w-[16rem] flex-1"
        />

        <FilterSidebar
          value={filter}
          onChange={setFilter}
          statusOptions={[]}
          subjectOptions={subjectOptions}
          subjectLabel={t("filterSubject")}
          dateRangeLabel={t("filterDateRange")}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant={data.length === 0 ? "no-data" : "no-results"}
          title={data.length === 0 ? t("emptyTitle") : t("noResultsTitle")}
          description={
            data.length === 0
              ? t("emptyDescription")
              : t("noResultsDescription")
          }
          action={
            data.length === 0
              ? {
                  label: t("logSession"),
                  onClick: handleCreate,
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              deleteLabel={t("delete")}
              editLabel={t("edit")}
              onEdit={() => handleEdit(session)}
              onDelete={() => setDeleteTarget(session)}
            />
          ))}
        </div>
      )}

      <LogSessionDialog
        open={logOpen}
        onOpenChange={handleDialogChange}
        subjects={subjects}
        lessons={lessons}
        session={editingSession}
        onSaved={() => {
          setEditingSession(null);
          setLogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        onConfirm={async () => {
          if (!deleteTarget) return;

          const result = await deleteStudySession(deleteTarget.id);

          if (!result.success) {
            throw new Error(result.error || t("genericError"));
          }

          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
