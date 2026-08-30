"use client";

import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  RotateCcw,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/types/notification";

/** Single source of truth for how each notification type is rendered. */
const TYPE_META: Record<
  NotificationType,
  { icon: typeof BellRing; className: string }
> = {
  "lesson.upcoming": {
    icon: CalendarClock,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "lesson.review_due": {
    icon: RotateCcw,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "homework.due_soon": {
    icon: ClipboardList,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "class.reminder": {
    icon: Users,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  "digest.daily": {
    icon: BellRing,
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  "assignment.published": {
    icon: ClipboardList,
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  "assignment.updated": {
    icon: FileEdit,
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  "assignment.due_soon": {
    icon: ClipboardList,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "submission.created": {
    icon: ClipboardList,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "submission.graded": {
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "exam.reminder": {
    icon: CalendarClock,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  "achievement.unlocked": {
    icon: Trophy,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "goal.completed": {
    icon: Target,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

export function NotificationIcon({ type, className }: NotificationIconProps) {
  const { icon: Icon, className: tone } = TYPE_META[type];

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full",
        tone,
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={2} />
    </span>
  );
}
