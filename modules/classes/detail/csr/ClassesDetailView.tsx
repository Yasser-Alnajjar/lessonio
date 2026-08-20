"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Clock, MapPin, Pencil, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { StatusBadge } from "@/components/ui-system/status-badge";
import { Link, useRouter } from "@/i18n/navigation";
import type { ClassWithRelations } from "@/lib/types/class";
import type { Subject } from "@/lib/types/subject";
import { ClassFormDialog } from "../../components/ClassFormDialog";
import { ClassStatusControls } from "../../components/ClassStatusControls";
import { DeleteClassDialog } from "../../components/DeleteClassDialog";

interface ClassesDetailViewProps {
  data: ClassWithRelations | null;
  classId: string;
  subjects: Subject[];
}

export const ClassesDetailView = ({ data, subjects }: ClassesDetailViewProps) => {
  const t = useTranslations("classes.detail");
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
            onClick: () => router.push("/classes/list"),
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/classes/list"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" />
        {t("backToList")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: data.subjectColor }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: data.subjectColor }}
            />
            {data.subjectName}
          </span>
          <h1 className="text-xl font-semibold text-foreground">
            {format(parseISO(data.date), "MMM d, yyyy")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            {t("edit")}
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

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {data.startTime.slice(0, 5)} · {data.durationMinutes} {t("minutesSuffix")}
          </span>
          {data.teacher && (
            <span className="inline-flex items-center gap-1.5">
              <User className="size-4" />
              {data.teacher}
            </span>
          )}
          {data.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" />
              {data.location}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge kind="attendance" status={data.attendanceStatus} />
          {data.examStatus !== "none" && (
            <StatusBadge kind="exam" status={data.examStatus} />
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">{t("statusTitle")}</h2>
        <ClassStatusControls klass={data} onUpdated={() => router.refresh()} />
      </div>

      <ClassFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        klass={data}
        subjects={subjects}
        onSaved={() => router.refresh()}
      />

      <DeleteClassDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        klass={data}
        onDeleted={() => router.push("/classes/list")}
      />
    </div>
  );
};
