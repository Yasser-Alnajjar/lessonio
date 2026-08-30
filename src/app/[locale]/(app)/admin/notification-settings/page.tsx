import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Admin } from "@modules";

export default function AdminNotificationSettingsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Admin.AdminNotificationSettings />
    </Suspense>
  );
}
