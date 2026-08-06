"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { SubjectWithStats } from "@/lib/types/subject";

interface SubjectsListViewProps {
  data: SubjectWithStats[];
}

export const SubjectsListView = ({ data }: SubjectsListViewProps) => {
  return (
    <FeaturePlaceholder
      title="Subjects"
      description="This view will be built in Phase 8 (Subject CRUD)."
      itemCount={data.length}
    />
  );
};
