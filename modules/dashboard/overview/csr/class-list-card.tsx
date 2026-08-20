"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui-system/empty-state";
import { ClassCard } from "@/components/ui-system/class-card";
import type { ClassWithRelations } from "@/lib/types/class";

interface ClassListCardProps {
  title: string;
  classes: ClassWithRelations[];
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
            {classes.map((klass) => (
              <ClassCard
                key={klass.id}
                klass={klass}
                href={`/classes/detail/${klass.id}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
