import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Calendar } from "@modules";

export default function CalendarMonthPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Calendar.CalendarMonth />
    </Suspense>
  );
}
