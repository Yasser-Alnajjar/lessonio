"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { Achievement } from "@/lib/types/achievement";

interface GamificationAchievementsViewProps {
  data: Achievement[];
}

export const GamificationAchievementsView = ({ data }: GamificationAchievementsViewProps) => {
  return (
    <FeaturePlaceholder
      title="Achievements"
      description="This view will be built in relevant CRUD phases."
      itemCount={data.length}
    />
  );
};
