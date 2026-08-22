import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Teaching } from "@modules";

interface TeachingGradingPageProps {
  params: Promise<{ assignmentId: string }>;
}

export default function TeachingGradingPage({
  params,
}: TeachingGradingPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Teaching.TeachingGrading params={params} />
    </Suspense>
  );
}
