"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { ClassOccurrenceCard } from "@/components/ui-system/class-occurrence-card";
import type { ClassOccurrenceWithRelations } from "@/lib/types/class-occurrence";

interface ClassListCardProps {
  title: string;
  classes: ClassOccurrenceWithRelations[];
  emptyMessage: string;
}

export function ClassListCard({
  title,
  classes,
  emptyMessage,
}: ClassListCardProps) {
  return (
    <Card data-slot="class-list-card" className="gap-4">
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {classes.length === 0 ? (
          <EmptyState
            variant="no-data"
            title={emptyMessage}
            className="min-h-40 p-6"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {classes.map((occurrence) => (
              <ClassOccurrenceCard
                key={occurrence.id}
                occurrence={occurrence}
                href={`/classes/detail/${occurrence.classId}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
