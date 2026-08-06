import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Notifications } from "@modules";

export default function NotificationsCenterPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Notifications.NotificationsCenter />
    </Suspense>
  );
}
