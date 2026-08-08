import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Statistics } from "@modules";

export default function StatisticsOverviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Statistics.StatisticsOverview />
    </Suspense>
  );
}
