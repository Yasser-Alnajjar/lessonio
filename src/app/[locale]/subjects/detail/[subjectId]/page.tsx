import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Subjects } from "@modules";

interface SubjectsDetailPageProps {
  params: Promise<{ subjectId: string }>;
}

export default function SubjectsDetailPage({ params }: SubjectsDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Subjects.SubjectsDetail params={params} />
    </Suspense>
  );
}
