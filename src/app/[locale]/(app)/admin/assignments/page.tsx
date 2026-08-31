import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Admin } from "@modules";

interface AdminAssignmentsPageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}

export default function AdminAssignmentsPage({
  searchParams,
}: AdminAssignmentsPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Admin.AdminAssignments searchParams={searchParams} />
    </Suspense>
  );
}
