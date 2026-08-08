"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import { ExamCard } from "@/components/ui-system/exam-card";
import {
  EMPTY_FILTER_VALUE,
  FilterSidebar,
  type FilterSidebarValue,
} from "@/components/ui-system/filter-sidebar";
import { SearchInput } from "@/components/ui-system/search-input";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import type { ExamWithRelations } from "@/lib/types/exam";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { Subject } from "@/lib/types/subject";
import { DeleteExamDialog } from "../../components/DeleteExamDialog";
import { ExamActionsMenu } from "../../components/ExamActionsMenu";
import { ExamFormDialog } from "../../components/ExamFormDialog";

interface ExamsListViewProps {
  data: ExamWithRelations[];
  lessons: LessonWithRelations[];
  subjects: Subject[];
}

interface FormState {
  open: boolean;
  exam: ExamWithRelations | null;
}

export const ExamsListView = ({ data, lessons, subjects }: ExamsListViewProps) => {
  const t = useTranslate("exams");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterSidebarValue>(EMPTY_FILTER_VALUE);
  const [showPast, setShowPast] = useState(false);
  const [formState, setFormState] = useState<FormState>({ open: false, exam: null });
  const [deleteTarget, setDeleteTarget] = useState<ExamWithRelations | null>(null);

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.name,
    color: subject.color,
  }));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((item) => {
      if (
        query &&
        !item.title.toLowerCase().includes(query) &&
        !item.lessonTitle.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (filter.subjectIds.length > 0 && !filter.subjectIds.includes(item.subjectId)) {
        return false;
      }
      if (filter.dateFrom && item.date < filter.dateFrom) return false;
      if (filter.dateTo && item.date > filter.dateTo) return false;
      return true;
    });
  }, [data, search, filter]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = filtered
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = filtered
    .filter((item) => item.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleScored = () => router.refresh();

  const renderCards = (items: ExamWithRelations[]) => {
    if (items.length === 0) {
      return (
        <EmptyState
          variant={data.length === 0 ? "no-data" : "no-results"}
          title={data.length === 0 ? t("list.emptyTitle") : t("list.noResultsTitle")}
          description={
            data.length === 0 ? t("list.emptyDescription") : t("list.noResultsDescription")
          }
          action={
            data.length === 0 && lessons.length > 0
              ? {
                  label: t("list.emptyAction"),
                  onClick: () => setFormState({ open: true, exam: null }),
                }
              : undefined
          }
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <ExamCard
            key={item.id}
            exam={item}
            notGradedLabel={t("card.notGraded")}
            scorePlaceholder={t("card.scorePlaceholder")}
            recordScoreLabel={t("card.recordScore")}
            outOfLabel={t("card.outOf")}
            onScored={handleScored}
            actions={
              <ExamActionsMenu
                onEdit={() => setFormState({ open: true, exam: item })}
                onDelete={() => setDeleteTarget(item)}
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
          <h1 className="text-xl font-semibold text-foreground">{t("list.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <Button
          onClick={() => setFormState({ open: true, exam: null })}
          disabled={lessons.length === 0}
        >
          <Plus />
          {t("list.newExam")}
        </Button>
      </div>

      {lessons.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("list.noLessonsHint")}</p>
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
          statusOptions={[]}
          subjectOptions={subjectOptions}
          subjectLabel={t("list.filterSubject")}
          dateRangeLabel={t("list.filterDateRange")}
        />
      </div>

      {renderCards(upcoming)}

      {past.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            onClick={() => setShowPast((prev) => !prev)}
          >
            {showPast ? t("list.hidePast") : t("list.showPast")} ({past.length})
          </Button>
          {showPast && renderCards(past)}
        </div>
      )}

      <ExamFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        exam={formState.exam}
        lessons={lessons}
        onSaved={() => router.refresh()}
      />

      <DeleteExamDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        exam={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
