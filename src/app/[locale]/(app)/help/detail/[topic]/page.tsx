import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Help } from "@modules";

interface HelpDetailPageProps {
  params: Promise<{ topic: string }>;
}

export default function HelpDetailPage({ params }: HelpDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Help.HelpDetail params={params} />
    </Suspense>
  );
}
