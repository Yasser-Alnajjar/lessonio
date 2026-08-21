import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Classroom } from "@modules";

export default function ClassroomClassesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Classroom.ClassroomClasses />
    </Suspense>
  );
}
