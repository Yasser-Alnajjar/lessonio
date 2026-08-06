import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Lessons } from "@modules";

interface LessonsDetailPageProps {
  params: Promise<{ lessonId: string }>;
}

export default function LessonsDetailPage({ params }: LessonsDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Lessons.LessonsDetail params={params} />
    </Suspense>
  );
}
