import { Actions } from "@/actions";
import { NotificationsCenterView } from "../csr/NotificationsCenterView";

export const NotificationsCenter = async () => {
  const { data, error } = await Actions.Notifications.getAll();
  const safeData = data ?? [];

  return <NotificationsCenterView data={safeData} loadError={error !== null} />;
};
