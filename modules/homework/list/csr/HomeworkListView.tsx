"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { HomeworkWithRelations } from "@/lib/types/homework";

interface HomeworkListViewProps {
  data: HomeworkWithRelations[];
}

export const HomeworkListView = ({ data }: HomeworkListViewProps) => {
  return (
    <FeaturePlaceholder
      title="Homework"
      description="This view will be built in Phase 11 (Homework & Exams)."
      itemCount={data.length}
    />
  );
};
