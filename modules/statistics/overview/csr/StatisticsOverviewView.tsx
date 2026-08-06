"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { StatisticsOverviewData } from "@/lib/types/statistics";

interface StatisticsOverviewViewProps {
  data: StatisticsOverviewData | null;
}

export const StatisticsOverviewView = ({ data }: StatisticsOverviewViewProps) => {
  return (
    <FeaturePlaceholder
      title="Statistics"
      description="This view will be built in Phase 13 (Statistics)."
      itemCount={data ? 1 : 0}
    />
  );
};
