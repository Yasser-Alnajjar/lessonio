"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { toggleActiveClass } from "@/actions/classes.mutations";
import { Button } from "@/components/ui/button";
import { ClassOccurrenceCard } from "@/components/ui-system/class-occurrence-card";
import { EmptyState } from "@/components/ui-system/empty-state";
import {
  EMPTY_FILTER_VALUE,
  FilterSidebar,
  type FilterSidebarValue,
} from "@/components/ui-system/filter-sidebar";
import { SearchInput } from "@/components/ui-system/search-input";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import { ATTENDANCE_STATUSES } from "@/lib/types/class-occurrence";
import type { ClassOccurrenceWithRelations } from "@/lib/types/class-occurrence";
import type { ClassWithSubject } from "@/lib/types/class";
import type { EnrolledClass } from "@/lib/types/enrollment";
import type { Subject } from "@/lib/types/subject";
import { ClassActionsMenu } from "../../components/ClassActionsMenu";
import { ClassFormDialog } from "../../components/ClassFormDialog";
import { ClassOccurrenceStatusControls } from "../../components/ClassOccurrenceStatusControls";
import { DeleteClassDialog } from "../../components/DeleteClassDialog";
import { RecurringClassCard } from "../../components/RecurringClassCard";

interface ClassesListViewProps {
  today: ClassOccurrenceWithRelations[];
  upcoming: ClassOccurrenceWithRelations[];
  classes: ClassWithSubject[];
  subjects: Subject[];
  enrolledClasses: EnrolledClass[];
}

interface FormState {
  open: boolean;
  item: ClassWithSubject | null;
}

export const ClassesListView = ({
  today,
  upcoming,
  classes,
  subjects,
  enrolledClasses,
}: ClassesListViewProps) => {
  const t = useTranslate("classes");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterSidebarValue>(EMPTY_FILTER_VALUE);
  const [formState, setFormState] = useState<FormState>({
    open: false,
    item: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<ClassWithSubject | null>(
    null,
  );

  const statusOptions = ATTENDANCE_STATUSES.map((status) => ({
    value: status,
    label: t(`status.attendance.${status}`),
  }));

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id,
    label: subject.name,
    color: subject.color,
  }));

  // Search and filters apply to the occurrence sections; the weekly schedule
  // below is the full list of classes, which is what the filters are drawn
  // from in the first place.
  const filterOccurrences = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (occurrences: ClassOccurrenceWithRelations[]) =>
      occurrences.filter((occurrence) => {
        if (
          query &&
          !occurrence.subjectName.toLowerCase().includes(query) &&
          !(occurrence.teacher ?? "").toLowerCase().includes(query) &&
          !(occurrence.location ?? "").toLowerCase().includes(query)
        ) {
          return false;
        }
        if (
          filter.statuses.length > 0 &&
          !(
            occurrence.attendanceStatus &&
            filter.statuses.includes(occurrence.attendanceStatus)
          )
        ) {
          return false;
        }
        if (
          filter.subjectIds.length > 0 &&
          !filter.subjectIds.includes(occurrence.subjectId)
        ) {
          return false;
        }
        if (filter.dateFrom && occurrence.date < filter.dateFrom) return false;
        if (filter.dateTo && occurrence.date > filter.dateTo) return false;
        return true;
      });
  }, [search, filter]);

  const visibleToday = filterOccurrences(today);
  const visibleUpcoming = filterOccurrences(upcoming);

  const handleToggleActive = async (item: ClassWithSubject) => {
    await toggleActiveClass(item.id);
    router.refresh();
  };

  const openCreate = () => setFormState({ open: true, item: null });

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("list.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <Button onClick={openCreate} disabled={subjects.length === 0}>
          <Plus />
          {t("list.newClass")}
        </Button>
      </div>

      {subjects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t("list.noSubjectsHint")}
        </p>
      )}

      {classes.length === 0 ? (
        <EmptyState
          variant="no-data"
          title={t("list.emptyTitle")}
          description={t("list.emptyDescription")}
          action={
            subjects.length > 0
              ? { label: t("list.emptyAction"), onClick: openCreate }
              : undefined
          }
        />
      ) : (
        <>
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

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("list.today")}
            </h2>
            {visibleToday.length === 0 ? (
              <EmptyState
                variant={today.length === 0 ? "no-data" : "no-results"}
                title={
                  today.length === 0
                    ? t("list.todayEmptyTitle")
                    : t("list.noResultsTitle")
                }
                description={
                  today.length === 0
                    ? t("list.todayEmptyDescription")
                    : t("list.noResultsDescription")
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleToday.map((occurrence) => (
                  <ClassOccurrenceCard
                    key={occurrence.id}
                    occurrence={occurrence}
                    // Attendance and exam are editable inline for today's
                    // classes — the write is scoped to this date's id, so
                    // next week's occurrence keeps its own state.
                    footer={
                      <ClassOccurrenceStatusControls
                        occurrence={occurrence}
                        onUpdated={() => router.refresh()}
                      />
                    }
                  />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("list.upcoming")}
            </h2>
            {visibleUpcoming.length === 0 ? (
              <EmptyState
                variant={upcoming.length === 0 ? "no-data" : "no-results"}
                title={
                  upcoming.length === 0
                    ? t("list.upcomingEmptyTitle")
                    : t("list.noResultsTitle")
                }
                description={
                  upcoming.length === 0
                    ? t("list.upcomingEmptyDescription")
                    : t("list.noResultsDescription")
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleUpcoming.map((occurrence) => (
                  <ClassOccurrenceCard
                    key={occurrence.id}
                    occurrence={occurrence}
                    href={`/classes/detail/${occurrence.classId}`}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("list.weeklySchedule")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {classes.map((item) => {
                return (
                  <RecurringClassCard
                    key={item.id}
                    item={item}
                    actions={
                      <ClassActionsMenu
                        item={item}
                        onEdit={() => setFormState({ open: true, item })}
                        onToggleActive={() => handleToggleActive(item)}
                        onDelete={() => setDeleteTarget(item)}
                      />
                    }
                  />
                );
              })}
            </div>
          </section>
        </>
      )}

      <ClassFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        item={formState.item}
        subjects={subjects}
        enrolledClasses={enrolledClasses}
        onSaved={() => router.refresh()}
      />

      <DeleteClassDialog
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
