import { Suspense } from "react";
import type { Metadata } from "next";

import { Actions } from "@/actions";
import { PageLoader } from "@/components/shared/page-loader";
import { privatePageMetadata } from "@/lib/seo";
import { Teaching } from "@modules";

interface TeachingGradingPageProps {
  params: Promise<{ assignmentId: string }>;
}

export async function generateMetadata({
  params,
}: TeachingGradingPageProps): Promise<Metadata> {
  const { assignmentId } = await params;
  const { data: assignment } = await Actions.Assignments.getById(assignmentId);

  return privatePageMetadata(
    assignment ? `Grade: ${assignment.title}` : "Grade assignment",
    assignment ? `Grading for ${assignment.className}.` : undefined,
  );
}

export default function TeachingGradingPage({
  params,
}: TeachingGradingPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Teaching.TeachingGrading params={params} />
    </Suspense>
  );
}
