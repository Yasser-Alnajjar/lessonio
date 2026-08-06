"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { UserSettings } from "@/lib/types/settings";

interface SettingsNotificationPreferencesViewProps {
  data: UserSettings | null;
}

export const SettingsNotificationPreferencesView = ({ data }: SettingsNotificationPreferencesViewProps) => {
  return (
    <FeaturePlaceholder
      title="Notification preferences"
      description="This view will be built in Phase 16 (Settings)."
      itemCount={data ? 1 : 0}
    />
  );
};
