"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { rescheduleLesson } from "@/actions/calendar.mutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LessonCard } from "@/components/ui-system/lesson-card";
import { useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import type { CalendarDay, CalendarMonthData } from "@/lib/types/calendar";
import type { Subject } from "@/lib/types/subject";

interface CalendarMonthViewProps {
  data: CalendarMonthData | null;
  subjects: Subject[];
  year: number;
  month: number;
}

export const CalendarMonthView = ({ data, subjects, year, month }: CalendarMonthViewProps) => {
  const t = useTranslate("calendar");
  const locale = useLocale();
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthDate = new Date(year, month - 1, 1);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    monthDate,
  );
  const leadingBlanks = monthDate.getDay();
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const days = data?.days ?? [];

  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2023, 0, index + 1)),
  );

  const goToMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    router.push(
      `/calendar/month?year=${next.getFullYear()}&month=${next.getMonth() + 1}`,
    );
  };

  const handleDrop = (targetDate: string, event: React.DragEvent) => {
    event.preventDefault();
    setDragOverDate(null);
    const lessonId = event.dataTransfer.getData("text/plain");
    if (!lessonId) return;

    setError(null);
    setIsPending(true);
    void rescheduleLesson(lessonId, targetDate).then((result) => {
      setIsPending(false);
      if (!result.success) {
        setError(result.error ?? t("month.rescheduleError"));
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("month.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("month.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => goToMonth(-1)}
            aria-label={t("month.previous")}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium text-foreground">
            {monthLabel}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => goToMonth(1)}
            aria-label={t("month.next")}
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {subjects.map((subject) => (
            <span
              key={subject.id}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.name}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div
        className={cn(
          "grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border transition-opacity",
          isPending && "opacity-70",
        )}
      >
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <div key={`blank-${index}`} className="min-h-24 bg-background/40" />
        ))}

        {days.map((day) => {
          const isToday = day.date === todayIso;
          const isDragOver = dragOverDate === day.date;
          const visibleLessons = day.lessons.slice(0, 3);
          const overflowCount = day.lessons.length - visibleLessons.length;
          const dayNumber = Number(day.date.slice(-2));

          return (
            <div
              key={day.date}
              role="button"
              tabIndex={0}
              className={cn(
                "flex min-h-24 flex-col gap-1 bg-background p-1.5 text-start transition-colors cursor-pointer hover:bg-accent/50",
                isDragOver && "bg-accent",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverDate(day.date);
              }}
              onDragLeave={() =>
                setDragOverDate((current) => (current === day.date ? null : current))
              }
              onDrop={(event) => handleDrop(day.date, event)}
              onClick={() => setSelectedDay(day)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedDay(day);
              }}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday
                    ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {dayNumber}
              </span>
              <div className="flex flex-col gap-1">
                {visibleLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", lesson.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="flex cursor-grab items-center gap-1 truncate rounded px-1 py-0.5 text-[0.65rem] text-foreground active:cursor-grabbing"
                    style={{ backgroundColor: `${lesson.subjectColor}22` }}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: lesson.subjectColor }}
                    />
                    <span className="truncate">{lesson.title}</span>
                  </div>
                ))}
                {overflowCount > 0 && (
                  <span className="text-[0.65rem] text-muted-foreground">
                    {t("month.more", { count: overflowCount })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay &&
                new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
                  parseISO(selectedDay.date),
                )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {selectedDay && selectedDay.lessons.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("month.dayEmpty")}</p>
            )}
            {selectedDay?.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                href={`/lessons/detail/${lesson.id}`}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
