import { Suspense } from "react";
import type { Metadata } from "next";
import { PageLoader } from "@/components/shared/page-loader";
import { Actions } from "@/actions";
import { privatePageMetadata } from "@/lib/seo";
import { Lessons } from "@modules";

interface LessonsDetailPageProps {
  params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({
  params,
}: LessonsDetailPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const { data: lesson } = await Actions.Lessons.getById(lessonId);

  return privatePageMetadata(
    lesson?.title ?? "Lesson",
    lesson ? `Lesson in ${lesson.subjectName}.` : undefined,
  );
}

export default function LessonsDetailPage({ params }: LessonsDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Lessons.LessonsDetail params={params} />
    </Suspense>
  );
}
