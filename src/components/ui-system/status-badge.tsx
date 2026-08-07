"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AttendanceStatus,
  LessonExamStatus,
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
 * Single source of truth for how each lesson-related status renders.
 * Labels are resolved through next-intl.
 */
export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  attended: { label: "attended", variant: "default" },
  absent: { label: "absent", variant: "destructive" },
  late: { label: "late", variant: "outline" },
  cancelled: { label: "cancelled", variant: "secondary" },
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

export const EXAM_STATUS_META: Record<LessonExamStatus, StatusMeta> = {
  none: { label: "none", variant: "secondary" },
  upcoming: { label: "upcoming", variant: "outline" },
  completed: { label: "completed", variant: "default" },
};

type StatusBadgeProps = React.ComponentProps<typeof Badge> &
  (
    | { kind: "attendance"; status: AttendanceStatus }
    | { kind: "study"; status: StudyStatus }
    | { kind: "review"; status: ReviewStatus }
    | { kind: "homework"; status: LessonHomeworkStatus }
    | { kind: "exam"; status: LessonExamStatus }
  );

function getStatusMeta(props: StatusBadgeProps): StatusMeta {
  switch (props.kind) {
    case "attendance":
      return ATTENDANCE_STATUS_META[props.status];

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

export function StatusBadge(props: StatusBadgeProps) {
  const t = useTranslate("lessons.status");

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
