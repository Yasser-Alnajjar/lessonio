"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { updateClass } from "@/actions/classes.mutations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANCE_STATUSES, CLASS_EXAM_STATUSES } from "@/lib/types/class";
import type {
  AttendanceStatus,
  ClassExamStatus,
  ClassWithRelations,
} from "@/lib/types/class";

/** Select value standing in for `attendanceStatus: null` — "not recorded yet". */
const ATTENDANCE_UNSET_VALUE = "unset";

export interface ClassStatusControlsProps {
  klass: ClassWithRelations;
  onUpdated?: () => void;
}

export function ClassStatusControls({
  klass,
  onUpdated,
}: ClassStatusControlsProps) {
  const t = useTranslations("classes.status");
  const [isPending, startTransition] = useTransition();

  const attendanceOptions = [
    { label: t("attendance.not_recorded"), value: ATTENDANCE_UNSET_VALUE },
    ...ATTENDANCE_STATUSES.map((status) => ({
      label: t(`attendance.${status}`),
      value: status,
    })),
  ];

  const examOptions = CLASS_EXAM_STATUSES.map((status) => ({
    label: t(`exam.${status}`),
    value: status,
  }));

  const onAttendanceChange = (value: string) =>
    startTransition(async () => {
      await updateClass(klass.id, {
        attendanceStatus:
          value === ATTENDANCE_UNSET_VALUE ? null : (value as AttendanceStatus),
      });
      onUpdated?.();
    });

  const onExamChange = (value: string) =>
    startTransition(async () => {
      await updateClass(klass.id, { examStatus: value as ClassExamStatus });
      onUpdated?.();
    });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {t("attendance.label")}
        </label>
        <Select
          value={klass.attendanceStatus ?? ATTENDANCE_UNSET_VALUE}
          onValueChange={onAttendanceChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {attendanceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
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
        <Select value={klass.examStatus} onValueChange={onExamChange} disabled={isPending}>
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

