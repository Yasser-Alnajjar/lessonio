"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { StudySession } from "@/lib/types/study-session";

interface StudySessionsHistoryViewProps {
  data: StudySession[];
}

export const StudySessionsHistoryView = ({ data }: StudySessionsHistoryViewProps) => {
  return (
    <FeaturePlaceholder
      title="Study sessions"
      description="This view will be built in Phase 10 (Study Sessions)."
      itemCount={data.length}
    />
  );
};
