"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { ExamWithRelations } from "@/lib/types/exam";

interface ExamsListViewProps {
  data: ExamWithRelations[];
}

export const ExamsListView = ({ data }: ExamsListViewProps) => {
  return (
    <FeaturePlaceholder
      title="Exams"
      description="This view will be built in Phase 11 (Homework & Exams)."
      itemCount={data.length}
    />
  );
};
