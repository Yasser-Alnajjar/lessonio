import { Actions } from "@/actions";
import { SettingsDataView } from "../csr/SettingsDataView";

export const SettingsData = async () => {
  const { data } = await Actions.Settings.get();
  const safeData = data ?? null;

  return <SettingsDataView data={safeData} />;
};
