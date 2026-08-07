"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { LessonCard } from "@/components/ui-system/lesson-card";
import type { LessonWithRelations } from "@/lib/types/lesson";

interface LessonListCardProps {
  title: string;
  lessons: LessonWithRelations[];
  emptyMessage: string;
}

export function LessonListCard({ title, lessons, emptyMessage }: LessonListCardProps) {
  return (
    <Card data-slot="lesson-list-card" className="gap-4">
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <EmptyState variant="no-data" title={emptyMessage} className="min-h-[10rem] p-6" />
        ) : (
          <div className="flex flex-col gap-3">
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                href={`/lessons/detail/${lesson.id}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
