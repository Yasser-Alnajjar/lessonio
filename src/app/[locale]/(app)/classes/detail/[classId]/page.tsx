import { Suspense } from "react";
import type { Metadata } from "next";
import { PageLoader } from "@/components/shared/page-loader";
import { Actions } from "@/actions";
import { privatePageMetadata } from "@/lib/seo";
import { Classes } from "@modules";

interface ClassesDetailPageProps {
  params: Promise<{ classId: string }>;
}

export async function generateMetadata({
  params,
}: ClassesDetailPageProps): Promise<Metadata> {
  const { classId } = await params;
  const { data: _class } = await Actions.Classes.getById(classId);

  return privatePageMetadata(
    _class?.subjectName ?? "Class",
    _class
      ? `Your ${_class.subjectName} class schedule and details.`
      : undefined,
  );
}

export default function ClassesDetailPage({ params }: ClassesDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Classes.ClassesDetail params={params} />
    </Suspense>
  );
}
