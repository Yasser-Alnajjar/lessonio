"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play, Square, X } from "lucide-react";

import {
  cancelStudySession,
  startStudySession,
  stopStudySession,
} from "@/actions/study-sessions.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import type { LessonWithRelations } from "@/lib/types/lesson";
import type { StudySessionWithRelations } from "@/lib/types/study-session";
import type { Subject } from "@/lib/types/subject";

const NO_SUBJECT = "__none__";

export interface FocusTimerProps {
  running: StudySessionWithRelations | null;
  subjects: Subject[];
  lessons: LessonWithRelations[];
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function FocusTimer({ running, subjects, lessons }: FocusTimerProps) {
  const t = useTranslate("studySessions.focus");
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<string>(NO_SUBJECT);
  const [lessonId, setLessonId] = useState<string>(NO_SUBJECT);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = new Date(running.startedAt).getTime();
    const tick = () =>
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const lessonOptions = useMemo(
    () =>
      subjectId === NO_SUBJECT
        ? lessons
        : lessons.filter((lesson) => lesson.subjectId === subjectId),
    [lessons, subjectId],
  );

  const startMutation = useMutation({
    mutationFn: () =>
      startStudySession({
        subjectId: subjectId === NO_SUBJECT ? undefined : subjectId,
        lessonId: lessonId === NO_SUBJECT ? undefined : lessonId,
      }),
    onSuccess: (result) => {
      if (result.success) router.refresh();
    },
  });

  const stopMutation = useMutation({
    mutationFn: (id: string) => stopStudySession(id),
    onSuccess: (result) => {
      if (result.success) router.refresh();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelStudySession(id),
    onSuccess: (result) => {
      if (result.success) router.refresh();
    },
  });

  const pending =
    startMutation.isPending ||
    stopMutation.isPending ||
    cancelMutation.isPending;
  const error =
    (startMutation.data && !startMutation.data.success
      ? startMutation.data.error
      : null) ??
    (stopMutation.data && !stopMutation.data.success
      ? stopMutation.data.error
      : null);

  return (
    <Card data-slot="focus-timer" className="gap-4">
      <CardContent className="flex flex-col items-center gap-6 py-8">
        <div
          className="font-mono text-5xl font-medium tabular-nums text-foreground"
          role="timer"
          aria-live="polite"
        >
          {formatElapsed(running ? elapsedSeconds : 0)}
        </div>

        {running ? (
          <div className="flex flex-col items-center gap-3">
            {(running.subjectName || running.lessonTitle) && (
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: running.subjectColor ?? undefined }}
              >
                {running.subjectColor && (
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: running.subjectColor }}
                  />
                )}
                {running.lessonTitle ?? running.subjectName}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => stopMutation.mutate(running.id)}
                disabled={pending}
                className="gap-2"
              >
                {stopMutation.isPending ? (
                  <LessonioSpinner className="size-4" />
                ) : (
                  <Square className="size-4" />
                )}
                {t("stop")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={pending}
                onClick={() => cancelMutation.mutate(running.id)}
                aria-label={t("cancel")}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <Select
              value={subjectId}
              onValueChange={(value) => {
                setSubjectId(value);
                setLessonId(NO_SUBJECT);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("subjectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUBJECT}>{t("noSubject")}</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={lessonId} onValueChange={setLessonId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("lessonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUBJECT}>{t("noLesson")}</SelectItem>
                {lessonOptions.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => startMutation.mutate()}
              disabled={pending}
              className="gap-2"
            >
              {startMutation.isPending ? (
                <LessonioSpinner className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
              {t("start")}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
