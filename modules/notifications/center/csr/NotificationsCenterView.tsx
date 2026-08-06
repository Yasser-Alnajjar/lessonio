"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { Notification } from "@/lib/types/notification";

interface NotificationsCenterViewProps {
  data: Notification[];
}

export const NotificationsCenterView = ({ data }: NotificationsCenterViewProps) => {
  return (
    <FeaturePlaceholder
      title="Notifications"
      description="This view will be built in Phase 14 (Notifications)."
      itemCount={data.length}
    />
  );
};
