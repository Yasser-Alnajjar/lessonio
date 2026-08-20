"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, parse } from "date-fns";
import { ArrowLeft, MapPin, Pencil, Trash2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClassOccurrenceCard } from "@/components/ui-system/class-occurrence-card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { Link, useRouter } from "@/i18n/navigation";
import { WEEKDAY_LABEL_KEYS } from "@/lib/constants/classes";
import type { ClassWithSubject } from "@/lib/types/class";
import type { ClassOccurrenceWithRelations } from "@/lib/types/class-occurrence";
import type { Subject } from "@/lib/types/subject";
import { ClassFormDialog } from "../../components/ClassFormDialog";
import { ClassOccurrenceStatusControls } from "../../components/ClassOccurrenceStatusControls";
import { DeleteClassDialog } from "../../components/DeleteClassDialog";

interface ClassesDetailViewProps {
  data: ClassWithSubject | null;
  occurrences: ClassOccurrenceWithRelations[];
  subjects: Subject[];
}

export const ClassesDetailView = ({
  data,
  occurrences,
  subjects,
}: ClassesDetailViewProps) => {
  const t = useTranslations("classes.detail");
  const tDays = useTranslations("classes.days");
  const tCard = useTranslations("classes.card");
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

  const sortedMeetings = [...data.meetings].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek,
  );

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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">
              {data.subjectName}
            </h1>
            <Badge variant={data.isActive ? "default" : "secondary"}>
              {data.isActive ? tCard("active") : tCard("inactive")}
            </Badge>
          </div>
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
        <h2 className="text-sm font-medium text-foreground">
          {t("scheduleTitle")}
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {sortedMeetings.map((meeting, index) => (
            <li key={`${meeting.dayOfWeek}-${index}`}>
              <span className="font-medium text-foreground">
                {tDays(WEEKDAY_LABEL_KEYS[meeting.dayOfWeek])}
              </span>{" "}
              ·{" "}
              {format(parse(meeting.startTime, "HH:mm", new Date()), "h:mm a")}{" "}
              · {meeting.durationMinutes} {t("minutesSuffix")}
            </li>
          ))}
        </ul>
        {(data.teacher || data.location) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
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
        )}
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("occurrencesTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("occurrencesDescription")}
        </p>
        {occurrences.length === 0 ? (
          <EmptyState
            variant="no-data"
            title={t("occurrencesEmptyTitle")}
            description={t("occurrencesEmptyDescription")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {occurrences.map((occurrence) => (
              <ClassOccurrenceCard
                key={occurrence.id}
                occurrence={occurrence}
                // Every date gets its own controls: recording attendance here
                // never touches any other week's occurrence.
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
      </div>

      <ClassFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        item={data}
        subjects={subjects}
        onSaved={() => router.refresh()}
      />

      <DeleteClassDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={data}
        onDeleted={() => router.push("/classes/list")}
      />
    </div>
  );
};
