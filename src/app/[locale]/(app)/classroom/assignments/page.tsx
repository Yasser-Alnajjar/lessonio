import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Classroom } from "@modules";

export default function ClassroomAssignmentsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Classroom.ClassroomAssignments />
    </Suspense>
  );
}
