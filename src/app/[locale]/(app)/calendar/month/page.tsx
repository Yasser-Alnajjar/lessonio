import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Calendar } from "@modules";

interface CalendarMonthPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default function CalendarMonthPage({
  searchParams,
}: CalendarMonthPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Calendar.CalendarMonth searchParams={searchParams} />
    </Suspense>
  );
}
