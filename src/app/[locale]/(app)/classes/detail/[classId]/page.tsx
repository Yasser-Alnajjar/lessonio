import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Classes } from "@modules";

interface ClassesDetailPageProps {
  params: Promise<{ classId: string }>;
}

export default function ClassesDetailPage({ params }: ClassesDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Classes.ClassesDetail params={params} />
    </Suspense>
  );
}
