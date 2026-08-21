import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Teaching } from "@modules";

interface TeachingRosterPageProps {
  params: Promise<{ classId: string }>;
}

export default function TeachingRosterPage({
  params,
}: TeachingRosterPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Teaching.TeachingRoster params={params} />
    </Suspense>
  );
}
