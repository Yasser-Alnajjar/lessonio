"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { updateLesson } from "@/actions/lessons.mutations";
import {
  ATTENDANCE_STATUS_META,
  EXAM_STATUS_META,
  HOMEWORK_STATUS_META,
  REVIEW_STATUS_META,
  STUDY_STATUS_META,
} from "@/components/ui-system/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ATTENDANCE_STATUSES,
  LESSON_EXAM_STATUSES,
  LESSON_HOMEWORK_STATUSES,
  REVIEW_STATUSES,
  STUDY_STATUSES,
} from "@/lib/types/lesson";
import type {
  AttendanceStatus,
  LessonExamStatus,
  LessonHomeworkStatus,
  LessonWithRelations,
  ReviewStatus,
  StudyStatus,
} from "@/lib/types/lesson";

export interface LessonStatusControlsProps {
  lesson: LessonWithRelations;
  onUpdated?: () => void;
}

export function LessonStatusControls({
  lesson,
  onUpdated,
}: LessonStatusControlsProps) {
  const t = useTranslations("lessons.status");
  const [isPending, startTransition] = useTransition();

  const fields: Array<{
    key: string;
    label: string;
    value: string;
    options: { label: string; value: string }[];
    meta: Record<string, { label: string }>;
    onChange: (value: string) => void;
  }> = [
    {
      key: "attendance",
      label: t("attendance.label"),
      value: lesson.attendanceStatus,
      options: ATTENDANCE_STATUSES.map((a) => ({
        label: t(`attendance.${a}`),
        value: a,
      })),
      meta: ATTENDANCE_STATUS_META,
      onChange: (value) =>
        startTransition(async () => {
          await updateLesson(lesson.id, {
            attendanceStatus: value as AttendanceStatus,
          });
          onUpdated?.();
        }),
    },
    {
      key: "study",
      label: t("study.label"),
      value: lesson.studyStatus,
      options: STUDY_STATUSES.map((s) => ({
        label: t(`study.${s}`),
        value: s,
      })),
      meta: STUDY_STATUS_META,
      onChange: (value) =>
        startTransition(async () => {
          await updateLesson(lesson.id, { studyStatus: value as StudyStatus });
          onUpdated?.();
        }),
    },
    {
      key: "review",
      label: t("review.label"),
      value: lesson.reviewStatus,
      options: REVIEW_STATUSES.map((r) => ({
        label: t(`review.${r}`),
        value: r,
      })),
      meta: REVIEW_STATUS_META,
      onChange: (value) =>
        startTransition(async () => {
          await updateLesson(lesson.id, {
            reviewStatus: value as ReviewStatus,
          });
          onUpdated?.();
        }),
    },
    {
      key: "homework",
      label: t("homework.label"),
      value: lesson.homeworkStatus,
      options: LESSON_HOMEWORK_STATUSES.map((h) => ({
        label: t(`homework.${h}`),
        value: h,
      })),
      meta: HOMEWORK_STATUS_META,
      onChange: (value) =>
        startTransition(async () => {
          await updateLesson(lesson.id, {
            homeworkStatus: value as LessonHomeworkStatus,
          });
          onUpdated?.();
        }),
    },
    {
      key: "exam",
      label: t("exam.label"),
      value: lesson.examStatus,
      options: LESSON_EXAM_STATUSES.map((e) => ({
        label: t(`exam.${e}`),
        value: e,
      })),
      meta: EXAM_STATUS_META,
      onChange: (value) =>
        startTransition(async () => {
          await updateLesson(lesson.id, {
            examStatus: value as LessonExamStatus,
          });
          onUpdated?.();
        }),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {fields.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {field.label}
          </label>
          <Select
            value={field.value}
            onValueChange={field.onChange}
            disabled={isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.label} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
