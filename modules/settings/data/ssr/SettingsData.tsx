import { Actions } from "@/actions";
import { SettingsDataView } from "../csr/SettingsDataView";

export const SettingsData = async () => {
  const [{ data }, { data: user }] = await Promise.all([
    Actions.Settings.get(),
    Actions.Auth.getSession(),
  ]);

  return <SettingsDataView data={data ?? null} email={user?.email ?? null} />;
};
