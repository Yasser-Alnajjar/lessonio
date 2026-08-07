import { Badge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AttendanceStatus,
  LessonExamStatus,
  LessonHomeworkStatus,
  ReviewStatus,
  StudyStatus,
} from "@/lib/types/lesson";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

/**
 * Single source of truth for how each lesson-related status renders, so
 * Lesson Card, Data Table, and Filter Sidebar never diverge in wording or color.
 */
export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  attended: { label: "Attended", variant: "default" },
  absent: { label: "Absent", variant: "destructive" },
  late: { label: "Late", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export const STUDY_STATUS_META: Record<StudyStatus, StatusMeta> = {
  not_started: { label: "Not started", variant: "secondary" },
  studying: { label: "Studying", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  reviewed: { label: "Reviewed", variant: "default" },
};

export const REVIEW_STATUS_META: Record<ReviewStatus, StatusMeta> = {
  not_reviewed: { label: "Not reviewed", variant: "secondary" },
  needs_review: { label: "Needs review", variant: "outline" },
  reviewed: { label: "Reviewed", variant: "default" },
};

export const HOMEWORK_STATUS_META: Record<LessonHomeworkStatus, StatusMeta> = {
  none: { label: "No homework", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  in_progress: { label: "In progress", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
};

export const EXAM_STATUS_META: Record<LessonExamStatus, StatusMeta> = {
  none: { label: "No exam", variant: "secondary" },
  upcoming: { label: "Upcoming", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
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
  const { className, kind: _kind, status: _status, ...rest } = props;
  const meta = getStatusMeta(props);

  return (
    <Badge
      variant={meta.variant}
      className={cn("capitalize", className)}
      {...rest}
    >
      {meta.label}
    </Badge>
  );
}
