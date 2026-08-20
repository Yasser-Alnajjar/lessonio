"use client";

import { format, parseISO } from "date-fns";
import { BookOpen, Clock, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StudySessionWithRelations } from "@/lib/types/study-session";

export interface SessionCardProps extends React.ComponentProps<"div"> {
  session: StudySessionWithRelations;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel: string;
  deleteLabel: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

export function SessionCard({
  session,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  className,
  ...props
}: SessionCardProps) {
  return (
    <Card
      data-slot="session-card"
      className={cn("h-full gap-3", className)}
      {...props}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          {session.subjectName && (
            <span
              className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{
                color: session.subjectColor ?? undefined,
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{
                  backgroundColor: session.subjectColor ?? undefined,
                }}
              />

              {session.subjectName}
            </span>
          )}

          <h3 className="truncate text-sm font-medium text-foreground">
            {format(parseISO(session.startedAt), "MMM d, yyyy · h:mm a")}
          </h3>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={editLabel}
                onClick={onEdit}
              >
                <Pencil className="size-4" />
              </Button>
            )}

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={deleteLabel}
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Clock className="size-3.5" />
            {formatDuration(session.durationMinutes ?? 0)}
          </span>

          {session.lessonTitle && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {session.lessonTitle}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
