import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Settings } from "@modules";

export default function SettingsProfilePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Settings.SettingsProfile />
    </Suspense>
  );
}
