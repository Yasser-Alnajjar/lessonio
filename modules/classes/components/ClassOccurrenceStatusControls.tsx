"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { updateClassOccurrenceStatus } from "@/actions/class-occurrences.mutations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ATTENDANCE_STATUSES,
  CLASS_EXAM_STATUSES,
} from "@/lib/types/class-occurrence";
import type {
  AttendanceStatus,
  ClassExamStatus,
  ClassOccurrenceWithRelations,
} from "@/lib/types/class-occurrence";

const ATTENDANCE_UNSET_VALUE = "unset";

export interface ClassOccurrenceStatusControlsProps {
  occurrence: ClassOccurrenceWithRelations;
  onUpdated?: () => void;
}

export function ClassOccurrenceStatusControls({
  occurrence,
  onUpdated,
}: ClassOccurrenceStatusControlsProps) {
  const t = useTranslations("classes.status");
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  const hasStarted = useMemo(() => {
    const start = new Date(
      `${occurrence.date}T${occurrence.startTime}`,
    ).getTime();

    return now >= start;
  }, [occurrence.date, occurrence.startTime, now]);

  useEffect(() => {
    if (hasStarted) return;

    const start = new Date(
      `${occurrence.date}T${occurrence.startTime}`,
    ).getTime();

    const delay = Math.max(start - Date.now(), 0);

    const timeout = window.setTimeout(() => {
      setNow(Date.now());
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [occurrence.date, occurrence.startTime, hasStarted]);
  const controlsDisabled = isPending || !hasStarted;

  const attendanceOptions = [
    {
      label: t("attendance.not_recorded"),
      value: ATTENDANCE_UNSET_VALUE,
      disabled: false,
    },
    ...ATTENDANCE_STATUSES.map((status) => ({
      label: t(`attendance.${status}`),
      value: status,
      disabled: status === "cancelled" && !controlsDisabled,
    })),
  ];

  const examOptions = CLASS_EXAM_STATUSES.map((status) => ({
    label: t(`exam.${status}`),
    value: status,
  }));

  const onAttendanceChange = (value: string) =>
    startTransition(async () => {
      await updateClassOccurrenceStatus(occurrence.id, {
        attendanceStatus:
          value === ATTENDANCE_UNSET_VALUE ? null : (value as AttendanceStatus),
      });

      onUpdated?.();
    });

  const onExamChange = (value: string) =>
    startTransition(async () => {
      await updateClassOccurrenceStatus(occurrence.id, {
        examStatus: value as ClassExamStatus,
      });

      onUpdated?.();
    });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t("attendance.label")}
        </label>

        <Select
          value={occurrence.attendanceStatus ?? ATTENDANCE_UNSET_VALUE}
          onValueChange={onAttendanceChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {attendanceOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t("exam.label")}
        </label>

        <Select value={occurrence.examStatus} onValueChange={onExamChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {examOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
