import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Grades } from "@modules";

export default function GradesOverviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Grades.GradesOverview />
    </Suspense>
  );
}
