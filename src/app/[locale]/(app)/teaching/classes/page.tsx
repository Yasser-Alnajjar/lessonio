import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Teaching } from "@modules";

export default function TeachingClassesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Teaching.TeachingClasses />
    </Suspense>
  );
}
