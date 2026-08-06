"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { Goal } from "@/lib/types/goal";

interface GamificationGoalsViewProps {
  data: Goal[];
}

export const GamificationGoalsView = ({ data }: GamificationGoalsViewProps) => {
  return (
    <FeaturePlaceholder
      title="Goals"
      description="This view will be built in relevant CRUD phases."
      itemCount={data.length}
    />
  );
};
