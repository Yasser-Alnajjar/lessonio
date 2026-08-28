import { Suspense } from "react";
import type { Metadata } from "next";

import { Actions } from "@/actions";
import { PageLoader } from "@/components/shared/page-loader";
import { privatePageMetadata } from "@/lib/seo";
import { Classroom } from "@modules";

interface ClassroomAssignmentPageProps {
  params: Promise<{ assignmentId: string }>;
}

export async function generateMetadata({
  params,
}: ClassroomAssignmentPageProps): Promise<Metadata> {
  const { assignmentId } = await params;
  const { data: assignment } = await Actions.Assignments.getById(assignmentId);

  return privatePageMetadata(
    assignment?.title ?? "Assignment",
    assignment?.instructions ??
      (assignment ? `Assignment for ${assignment.className}.` : undefined),
  );
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
