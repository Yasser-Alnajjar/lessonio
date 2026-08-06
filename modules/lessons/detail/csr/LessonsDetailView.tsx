"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { LessonWithRelations } from "@/lib/types/lesson";

interface LessonsDetailViewProps {
  data: LessonWithRelations | null;
  lessonId: string;
}

export const LessonsDetailView = ({ data, lessonId }: LessonsDetailViewProps) => {
  return (
    <FeaturePlaceholder
      title="Lesson detail"
      description={`Record ${lessonId} will render here starting Phase 9 (Lesson CRUD).`}
      itemCount={data ? 1 : 0}
    />
  );
};
