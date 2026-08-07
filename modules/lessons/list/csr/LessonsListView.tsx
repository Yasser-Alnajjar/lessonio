"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  toggleArchiveLesson,
  duplicateLesson,
} from "@/actions/lessons.mutations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import {
  EMPTY_FILTER_VALUE,
  FilterSidebar,
  type FilterSidebarValue,
} from "@/components/ui-system/filter-sidebar";
import { LessonCard } from "@/components/ui-system/lesson-card";
import { SearchInput } from "@/components/ui-system/search-input";
import { STUDY_STATUS_META } from "@/components/ui-system/status-badge";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import { STUDY_STATUSES } from "@/lib/types/lesson";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { Subject } from "@/lib/types/subject";
import type { Tag } from "@/lib/types/tag";
import { DeleteLessonDialog } from "../../components/DeleteLessonDialog";
import { LessonActionsMenu } from "../../components/LessonActionsMenu";
import { LessonFormDialog } from "../../components/LessonFormDialog";

interface LessonsListViewProps {
  data: LessonWithRelations[];
  subjects: Subject[];
  tags: Tag[];
}

interface FormState {
  open: boolean;
  lesson: LessonWithRelations | null;
}

export const LessonsListView = ({
  data,
  subjects,
  tags: initialTags,
}: LessonsListViewProps) => {
  const t = useTranslate("lessons");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterSidebarValue>(EMPTY_FILTER_VALUE);
  const [showArchived, setShowArchived] = useState(false);
  const [tags, setTags] = useState(initialTags);
  const [formState, setFormState] = useState<FormState>({
    open: false,
    lesson: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<LessonWithRelations | null>(
    null,
  );

  const statusOptions = STUDY_STATUSES.map((status) => ({
    value: status,
    label: STUDY_STATUS_META[status].label,
  }));
  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.name,
    color: subject.color,
  }));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((lesson) => {
      if (
        query &&
        !lesson.title.toLowerCase().includes(query) &&
        !(lesson.teacher ?? "").toLowerCase().includes(query) &&
        !(lesson.location ?? "").toLowerCase().includes(query)
      ) {
        return false;
      }
      if (
        filter.statuses.length > 0 &&
        !filter.statuses.includes(lesson.studyStatus)
      ) {
        return false;
      }
      if (
        filter.subjectIds.length > 0 &&
        !filter.subjectIds.includes(lesson.subjectId)
      ) {
        return false;
      }
      if (filter.dateFrom && lesson.date < filter.dateFrom) return false;
      if (filter.dateTo && lesson.date > filter.dateTo) return false;
      return true;
    });
  }, [data, search, filter]);

  const activeLessons = filtered.filter((lesson) => !lesson.isArchived);
  const archivedLessons = filtered.filter((lesson) => lesson.isArchived);

  const handleDuplicate = async (lesson: LessonWithRelations) => {
    await duplicateLesson(lesson.id);
    router.refresh();
  };

  const handleToggleArchive = async (lesson: LessonWithRelations) => {
    await toggleArchiveLesson(lesson.id);
    router.refresh();
  };

  const renderCards = (lessons: LessonWithRelations[]) => {
    if (lessons.length === 0) {
      return (
        <EmptyState
          variant={data.length === 0 ? "no-data" : "no-results"}
          title={
            data.length === 0 ? t("list.emptyTitle") : t("list.noResultsTitle")
          }
          description={
            data.length === 0
              ? t("list.emptyDescription")
              : t("list.noResultsDescription")
          }
          action={
            data.length === 0 && subjects.length > 0
              ? {
                  label: t("list.emptyAction"),
                  onClick: () => setFormState({ open: true, lesson: null }),
                }
              : undefined
          }
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            href={`/lessons/detail/${lesson.id}`}
            actions={
              <LessonActionsMenu
                lesson={lesson}
                onEdit={() => setFormState({ open: true, lesson })}
                onDuplicate={() => handleDuplicate(lesson)}
                onToggleArchive={() => handleToggleArchive(lesson)}
                onDelete={() => setDeleteTarget(lesson)}
              />
            }
          />
        ))}
      </div>
    );
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
          onClick={() => setFormState({ open: true, lesson: null })}
          disabled={subjects.length === 0}
        >
          <Plus />
          {t("list.newLesson")}
        </Button>
      </div>

      {subjects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("list.noSubjectsHint")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          onSearch={setSearch}
          placeholder={t("list.searchPlaceholder")}
          containerClassName="min-w-[16rem] flex-1"
        />
        <FilterSidebar
          value={filter}
          onChange={setFilter}
          statusOptions={statusOptions}
          subjectOptions={subjectOptions}
          statusLabel={t("list.filterStatus")}
          subjectLabel={t("list.filterSubject")}
          dateRangeLabel={t("list.filterDateRange")}
        />
      </div>

      {renderCards(activeLessons)}

      {archivedLessons.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            onClick={() => setShowArchived((prev) => !prev)}
          >
            {showArchived ? t("list.hideArchived") : t("list.showArchived")} (
            {archivedLessons.length})
          </Button>
          {showArchived && renderCards(archivedLessons)}
        </div>
      )}

      <LessonFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        lesson={formState.lesson}
        subjects={subjects}
        tags={tags}
        onTagCreated={(tag) => setTags((prev) => [...prev, tag])}
        onSaved={() => router.refresh()}
      />

      <DeleteLessonDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        lesson={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
