import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Lessons } from "@modules";

export default function LessonsListPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Lessons.LessonsList />
    </Suspense>
  );
}
