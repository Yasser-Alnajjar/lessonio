import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Admin } from "@modules";

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Admin.AdminOverview />
    </Suspense>
  );
}
