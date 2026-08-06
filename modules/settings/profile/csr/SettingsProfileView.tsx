"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { UserSettings } from "@/lib/types/settings";

interface SettingsProfileViewProps {
  data: UserSettings | null;
}

export const SettingsProfileView = ({ data }: SettingsProfileViewProps) => {
  return (
    <FeaturePlaceholder
      title="Profile settings"
      description="This view will be built in Phase 16 (Settings)."
      itemCount={data ? 1 : 0}
    />
  );
};
