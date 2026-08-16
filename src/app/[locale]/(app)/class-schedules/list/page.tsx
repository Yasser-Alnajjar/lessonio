import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { ClassSchedules } from "@modules";

export default function ClassSchedulesListPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ClassSchedules.ClassSchedulesList />
    </Suspense>
  );
}
