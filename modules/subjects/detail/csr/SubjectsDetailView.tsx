"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { SubjectWithStats } from "@/lib/types/subject";

interface SubjectsDetailViewProps {
  data: SubjectWithStats | null;
  subjectId: string;
}

export const SubjectsDetailView = ({ data, subjectId }: SubjectsDetailViewProps) => {
  return (
    <FeaturePlaceholder
      title="Subject detail"
      description={`Record ${subjectId} will render here starting Phase 8 (Subject CRUD).`}
      itemCount={data ? 1 : 0}
    />
  );
};
