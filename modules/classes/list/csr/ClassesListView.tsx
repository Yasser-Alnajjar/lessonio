"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClassCard } from "@/components/ui-system/class-card";
import { EmptyState } from "@/components/ui-system/empty-state";
import {
  EMPTY_FILTER_VALUE,
  FilterSidebar,
  type FilterSidebarValue,
} from "@/components/ui-system/filter-sidebar";
import { SearchInput } from "@/components/ui-system/search-input";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import { ATTENDANCE_STATUSES } from "@/lib/types/class";
import type { ClassWithRelations } from "@/lib/types/class";
import type { Subject } from "@/lib/types/subject";
import { ClassActionsMenu } from "../../components/ClassActionsMenu";
import { ClassFormDialog } from "../../components/ClassFormDialog";
import { DeleteClassDialog } from "../../components/DeleteClassDialog";

interface ClassesListViewProps {
  data: ClassWithRelations[];
  subjects: Subject[];
}

interface FormState {
  open: boolean;
  klass: ClassWithRelations | null;
}

export const ClassesListView = ({ data, subjects }: ClassesListViewProps) => {
  const t = useTranslate("classes");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterSidebarValue>(EMPTY_FILTER_VALUE);
  const [formState, setFormState] = useState<FormState>({
    open: false,
    klass: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<ClassWithRelations | null>(
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((klass) => {
      if (query && !(klass.teacher ?? "").toLowerCase().includes(query) &&
        !(klass.location ?? "").toLowerCase().includes(query)) {
        return false;
      }
      if (
        filter.statuses.length > 0 &&
        !(klass.attendanceStatus && filter.statuses.includes(klass.attendanceStatus))
      ) {
        return false;
      }
      if (
        filter.subjectIds.length > 0 &&
        !filter.subjectIds.includes(klass.subjectId)
      ) {
        return false;
      }
      if (filter.dateFrom && klass.date < filter.dateFrom) return false;
      if (filter.dateTo && klass.date > filter.dateTo) return false;
      return true;
    });
  }, [data, search, filter]);

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
          onClick={() => setFormState({ open: true, klass: null })}
          disabled={subjects.length === 0}
        >
          <Plus />
          {t("list.newClass")}
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

      {filtered.length === 0 ? (
        <EmptyState
          variant={data.length === 0 ? "no-data" : "no-results"}
          title={data.length === 0 ? t("list.emptyTitle") : t("list.noResultsTitle")}
          description={
            data.length === 0
              ? t("list.emptyDescription")
              : t("list.noResultsDescription")
          }
          action={
            data.length === 0 && subjects.length > 0
              ? {
                  label: t("list.emptyAction"),
                  onClick: () => setFormState({ open: true, klass: null }),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((klass) => (
            <ClassCard
              key={klass.id}
              klass={klass}
              href={`/classes/detail/${klass.id}`}
              actions={
                <ClassActionsMenu
                  onEdit={() => setFormState({ open: true, klass })}
                  onDelete={() => setDeleteTarget(klass)}
                />
              }
            />
          ))}
        </div>
      )}

      <ClassFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((prev) => ({ ...prev, open }))}
        klass={formState.klass}
        subjects={subjects}
        onSaved={() => router.refresh()}
      />

      <DeleteClassDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        klass={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
