"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AssignmentCard } from "@/components/ui-system/assignment-card";
import { EmptyState } from "@/components/ui-system/empty-state";
import {
  EMPTY_FILTER_VALUE,
  FilterSidebar,
  type FilterSidebarValue,
} from "@/components/ui-system/filter-sidebar";
import { HomeworkCard } from "@/components/ui-system/homework-card";
import { SearchInput } from "@/components/ui-system/search-input";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import type { AssignmentForStudent } from "@/lib/types/assignment";
import type { HomeworkWithRelations } from "@/lib/types/homework";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { Subject } from "@/lib/types/subject";
import { DeleteHomeworkDialog } from "../../components/DeleteHomeworkDialog";
import { HomeworkActionsMenu } from "../../components/HomeworkActionsMenu";
import { HomeworkFormDialog } from "../../components/HomeworkFormDialog";

interface HomeworkListViewProps {
  data: HomeworkWithRelations[];
  lessons: LessonWithRelations[];
  subjects: Subject[];
  assignedWork: AssignmentForStudent[];
}

interface FormState {
  open: boolean;
  homework: HomeworkWithRelations | null;
}

export const HomeworkListView = ({
  data,
  lessons,
  subjects,
  assignedWork,
}: HomeworkListViewProps) => {
  const t = useTranslate("homework");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterSidebarValue>(EMPTY_FILTER_VALUE);
  const [showCompleted, setShowCompleted] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    open: false,
    homework: null,
  });
  const [deleteTarget, setDeleteTarget] =
    useState<HomeworkWithRelations | null>(null);

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
      if (
        filter.subjectIds.length > 0 &&
        !filter.subjectIds.includes(item.subjectId)
      ) {
        return false;
      }
      if (filter.dateFrom && item.deadline < filter.dateFrom) return false;
      if (filter.dateTo && item.deadline > filter.dateTo) return false;
      return true;
    });
  }, [data, search, filter]);

  const pending = filtered
    .filter((item) => !item.completed)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const completed = filtered
    .filter((item) => item.completed)
    .sort((a, b) => b.deadline.localeCompare(a.deadline));

  const handleToggled = () => router.refresh();

  const renderCards = (items: HomeworkWithRelations[]) => {
    if (items.length === 0) {
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
            data.length === 0 && lessons.length > 0
              ? {
                  label: t("list.emptyAction"),
                  onClick: () => setFormState({ open: true, homework: null }),
                }
              : undefined
          }
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <HomeworkCard
            key={item.id}
            homework={item}
            overdueLabel={t("card.overdue")}
            onToggled={handleToggled}
            actions={
              <HomeworkActionsMenu
                onEdit={() => setFormState({ open: true, homework: item })}
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
          <h1 className="text-xl font-semibold text-foreground">
            {t("list.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <Button
          onClick={() => setFormState({ open: true, homework: null })}
          disabled={lessons.length === 0}
        >
          <Plus />
          {t("list.newHomework")}
        </Button>
      </div>

      {lessons.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("list.noLessonsHint")}
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
          statusOptions={[]}
          subjectOptions={subjectOptions}
          subjectLabel={t("list.filterSubject")}
          dateRangeLabel={t("list.filterDateRange")}
        />
      </div>

      {renderCards(pending)}

      {completed.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground"
            onClick={() => setShowCompleted((prev) => !prev)}
          >
            {showCompleted ? t("list.hideCompleted") : t("list.showCompleted")}{" "}
            ({completed.length})
          </Button>
          {showCompleted && renderCards(completed)}
        </div>
      )}

      {assignedWork.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t("list.teacherSection.title")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("list.teacherSection.subtitle")}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assignedWork.map((item) => (
              <AssignmentCard
                key={item.id}
                assignment={item}
                overdueLabel={t("card.overdue")}
                pointsLabel={t("list.teacherSection.points", {
                  points: item.totalPoints,
                })}
              />
            ))}
          </div>
        </div>
      )}

      <HomeworkFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        homework={formState.homework}
        lessons={lessons}
        onSaved={() => router.refresh()}
      />

      <DeleteHomeworkDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        homework={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
