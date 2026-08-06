import { Actions } from "@/actions";
import { SettingsNotificationPreferencesView } from "../csr/SettingsNotificationPreferencesView";

export const SettingsNotificationPreferences = async () => {
  const { data } = await Actions.Settings.get();
  const safeData = data ?? null;

  return <SettingsNotificationPreferencesView data={safeData} />;
};
