import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Exams } from "@modules";

export default function ExamsListPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Exams.ExamsList />
    </Suspense>
  );
}
