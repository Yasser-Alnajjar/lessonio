"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Pencil,
  Trash2,
} from "lucide-react";

import { updateSubject } from "@/actions/subjects.mutations";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui-system/empty-state";
import { StatisticCard } from "@/components/ui-system/statistic-card";
import { Link, useRouter } from "@/i18n/navigation";
import { SUBJECT_ICON_COMPONENTS } from "@/lib/constants/subjects";
import type { SubjectWithStats } from "@/lib/types/subject";
import { DeleteSubjectDialog } from "../../components/DeleteSubjectDialog";
import { SubjectFormDialog } from "../../components/SubjectFormDialog";

interface SubjectsDetailViewProps {
  data: SubjectWithStats | null;
  subjectId: string;
}

export const SubjectsDetailView = ({ data }: SubjectsDetailViewProps) => {
  const t = useTranslations("subjects.detail");
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!data) {
    return (
      <div className="p-4">
        <EmptyState
          title={t("notFoundTitle")}
          description={t("notFoundDescription")}
          action={{
            label: t("backToList"),
            onClick: () => router.push("/subjects/list"),
          }}
        />
      </div>
    );
  }

  const Icon = SUBJECT_ICON_COMPONENTS[data.icon];

  const handleToggleArchive = async () => {
    await updateSubject(data.id, { isArchived: !data.isArchived });
    router.refresh();
  };

  const stats = [
    {
      key: "totalLessons",
      label: t("totalLessons"),
      value: data.stats.totalLessons,
    },
    {
      key: "attendanceRate",
      label: t("attendanceRate"),
      value: data.stats.attendanceRate,
      suffix: "%",
    },
    {
      key: "studyRate",
      label: t("studyRate"),
      value: data.stats.studyRate,
      suffix: "%",
    },
    {
      key: "homeworkProgress",
      label: t("homeworkProgress"),
      value: data.stats.homeworkProgress,
      suffix: "%",
    },
    {
      key: "totalStudyMinutes",
      label: t("totalStudyMinutes"),
      value: data.stats.totalStudyMinutes,
      suffix: t("minutesSuffix"),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/subjects/list"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("backToList")}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: `color-mix(in oklch, ${data.color} 16%, transparent)`,
              color: data.color,
            }}
          >
            <Icon className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {data.name}
            </h1>
            {data.isArchived && (
              <span className="text-xs text-muted-foreground">
                {t("archivedNote")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            {t("edit")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleArchive}>
            {data.isArchived ? <ArchiveRestore /> : <Archive />}
            {data.isArchived ? t("unarchive") : t("archive")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            {t("delete")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <StatisticCard key={stat.key} stat={stat} />
        ))}
      </div>

      <SubjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        subject={data}
        onSaved={() => router.refresh()}
      />

      <DeleteSubjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        subject={data}
        onDeleted={() => router.push("/subjects/list")}
      />
    </div>
  );
};
