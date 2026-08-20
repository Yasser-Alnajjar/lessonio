"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AttendanceStatus, ClassExamStatus } from "@/lib/types/class";
import type {
  LessonHomeworkStatus,
  ReviewStatus,
  StudyStatus,
} from "@/lib/types/lesson";
import type { VariantProps } from "class-variance-authority";
import useTranslate from "@/hooks/useTranslate";

type BadgeVariant = VariantProps<typeof Badge>["variant"];

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

/**
 * Single source of truth for how each lesson/class-related status renders.
 * Labels are resolved through next-intl.
 */
export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  attended: { label: "attended", variant: "default" },
  absent: { label: "absent", variant: "destructive" },
  late: { label: "late", variant: "outline" },
  cancelled: { label: "cancelled", variant: "secondary" },
};

/** Shown for a class occurrence nobody has marked attendance for yet. */
const ATTENDANCE_NOT_RECORDED_META: StatusMeta = {
  label: "not_recorded",
  variant: "secondary",
};

export const STUDY_STATUS_META: Record<StudyStatus, StatusMeta> = {
  not_started: { label: "not_started", variant: "secondary" },
  studying: { label: "studying", variant: "outline" },
  completed: { label: "completed", variant: "default" },
  reviewed: { label: "reviewed", variant: "default" },
};

export const REVIEW_STATUS_META: Record<ReviewStatus, StatusMeta> = {
  not_reviewed: { label: "not_reviewed", variant: "secondary" },
  needs_review: { label: "needs_review", variant: "outline" },
  reviewed: { label: "reviewed", variant: "default" },
};

export const HOMEWORK_STATUS_META: Record<LessonHomeworkStatus, StatusMeta> = {
  none: { label: "none", variant: "secondary" },
  pending: { label: "pending", variant: "outline" },
  in_progress: { label: "in_progress", variant: "outline" },
  completed: { label: "completed", variant: "default" },
};

export const EXAM_STATUS_META: Record<ClassExamStatus, StatusMeta> = {
  none: { label: "none", variant: "secondary" },
  upcoming: { label: "upcoming", variant: "outline" },
  completed: { label: "completed", variant: "default" },
};

type StatusBadgeProps = React.ComponentProps<typeof Badge> &
  (
    | { kind: "attendance"; status: AttendanceStatus | null }
    | { kind: "study"; status: StudyStatus }
    | { kind: "review"; status: ReviewStatus }
    | { kind: "homework"; status: LessonHomeworkStatus }
    | { kind: "exam"; status: ClassExamStatus }
  );

function getStatusMeta(props: StatusBadgeProps): StatusMeta {
  switch (props.kind) {
    case "attendance":
      return props.status === null
        ? ATTENDANCE_NOT_RECORDED_META
        : ATTENDANCE_STATUS_META[props.status];

    case "study":
      return STUDY_STATUS_META[props.status];

    case "review":
      return REVIEW_STATUS_META[props.status];

    case "homework":
      return HOMEWORK_STATUS_META[props.status];

    case "exam":
      return EXAM_STATUS_META[props.status];
  }
}

/** attendance/exam moved to the `classes.status` namespace; the rest stay under `lessons.status`. */
const CLASS_STATUS_KINDS = new Set(["attendance", "exam"]);

export function StatusBadge(props: StatusBadgeProps) {
  const tLessons = useTranslate("lessons.status");
  const tClasses = useTranslate("classes.status");
  const t = CLASS_STATUS_KINDS.has(props.kind) ? tClasses : tLessons;

  const { className, kind, variant: _variant, ...rest } = props;

  const meta = getStatusMeta(props);

  return (
    <Badge
      variant={meta.variant}
      className={cn("capitalize", className)}
      {...rest}
    >
      {t(`${kind}.${meta.label}`)}
    </Badge>
  );
}
