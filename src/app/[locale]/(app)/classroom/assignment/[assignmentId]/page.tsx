import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Classroom } from "@modules";

interface ClassroomAssignmentPageProps {
  params: Promise<{ assignmentId: string }>;
}

export default function ClassroomAssignmentPage({
  params,
}: ClassroomAssignmentPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Classroom.ClassroomAssignmentDetail params={params} />
    </Suspense>
  );
}
