import { Actions } from "@/actions";
import { AdminNotificationSettingsView } from "../csr/AdminNotificationSettingsView";

export const AdminNotificationSettings = async () => {
  const { data } = await Actions.Admin.getNotificationSettings();
  const safeData = data ?? [];
  return <AdminNotificationSettingsView data={safeData} />;
};
