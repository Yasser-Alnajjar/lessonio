"use client";

import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import type { UserSettings } from "@/lib/types/settings";

interface SettingsDataViewProps {
  data: UserSettings | null;
}

export const SettingsDataView = ({ data }: SettingsDataViewProps) => {
  return (
    <FeaturePlaceholder
      title="Backup & data"
      description="This view will be built in Phase 16 (Settings)."
      itemCount={data ? 1 : 0}
    />
  );
};
