import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Admin } from "@modules";

interface AdminNotificationJobsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    eventType?: string;
  }>;
}

export default function AdminNotificationJobsPage({
  searchParams,
}: AdminNotificationJobsPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Admin.AdminNotificationJobs searchParams={searchParams} />
    </Suspense>
  );
}
