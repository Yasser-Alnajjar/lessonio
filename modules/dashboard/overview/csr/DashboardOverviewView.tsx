"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { DashboardOverviewData } from "@/lib/types/dashboard";

interface DashboardOverviewViewProps {
  data: DashboardOverviewData | null;
}

export const DashboardOverviewView = ({ data }: DashboardOverviewViewProps) => {
  return (
    <FeaturePlaceholder
      title="Dashboard"
      description="This view will be built in Phase 7 (Dashboard Layout)."
      itemCount={data ? 1 : 0}
    />
  );
};
