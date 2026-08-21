import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Home } from "@modules";

export default function HomePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Home.HomeRedirect />
    </Suspense>
  );
}
