import { Actions } from "@/actions";
import { SettingsProfileView } from "../csr/SettingsProfileView";

export const SettingsProfile = async () => {
  const { data } = await Actions.Auth.getSession();
  const safeData = data ?? null;

  return <SettingsProfileView data={safeData} />;
};
