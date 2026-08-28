import { Suspense } from "react";
import type { Metadata } from "next";
import { PageLoader } from "@/components/shared/page-loader";
import { Actions } from "@/actions";
import { privatePageMetadata } from "@/lib/seo";
import { Subjects } from "@modules";

interface SubjectsDetailPageProps {
  params: Promise<{ subjectId: string }>;
}

export async function generateMetadata({
  params,
}: SubjectsDetailPageProps): Promise<Metadata> {
  const { subjectId } = await params;
  const { data: subject } = await Actions.Subjects.getById(subjectId);

  return privatePageMetadata(
    subject?.name ?? "Subject",
    subject ? `Your ${subject.name} study progress and activity.` : undefined,
  );
}

export default function SubjectsDetailPage({
  params,
}: SubjectsDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Subjects.SubjectsDetail params={params} />
    </Suspense>
  );
}
