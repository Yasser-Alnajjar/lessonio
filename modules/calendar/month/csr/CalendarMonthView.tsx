"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { CalendarMonthData } from "@/lib/types/calendar";

interface CalendarMonthViewProps {
  data: CalendarMonthData | null;
}

export const CalendarMonthView = ({ data }: CalendarMonthViewProps) => {
  return (
    <FeaturePlaceholder
      title="Calendar"
      description="This view will be built in Phase 12 (Calendar)."
      itemCount={data ? 1 : 0}
    />
  );
};
