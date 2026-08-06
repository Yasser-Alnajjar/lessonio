"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { UserSettings } from "@/lib/types/settings";

interface SettingsAppearanceViewProps {
  data: UserSettings | null;
}

export const SettingsAppearanceView = ({ data }: SettingsAppearanceViewProps) => {
  return (
    <FeaturePlaceholder
      title="Appearance settings"
      description="This view will be built in Phase 16 (Settings)."
      itemCount={data ? 1 : 0}
    />
  );
};
