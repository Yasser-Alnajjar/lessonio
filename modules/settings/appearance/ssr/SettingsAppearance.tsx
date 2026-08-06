import { Actions } from "@/actions";
import { SettingsAppearanceView } from "../csr/SettingsAppearanceView";

export const SettingsAppearance = async () => {
  const { data } = await Actions.Settings.get();
  const safeData = data ?? null;

  return <SettingsAppearanceView data={safeData} />;
};
