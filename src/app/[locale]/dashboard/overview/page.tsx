import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Dashboard } from "@modules";

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Dashboard.DashboardOverview />
    </Suspense>
  );
}
