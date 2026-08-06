"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { LessonWithRelations } from "@/lib/types/lesson";

interface LessonsListViewProps {
  data: LessonWithRelations[];
}

export const LessonsListView = ({ data }: LessonsListViewProps) => {
  return (
    <FeaturePlaceholder
      title="Lessons"
      description="This view will be built in Phase 9 (Lesson CRUD)."
      itemCount={data.length}
    />
  );
};
