import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Teaching } from "@modules";

export default function TeachingAssignmentsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Teaching.TeachingAssignments />
    </Suspense>
  );
}
