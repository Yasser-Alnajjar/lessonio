import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Flashcards } from "@modules";

interface FlashcardsReviewPageProps {
  searchParams: Promise<{ subjectId?: string; lessonId?: string }>;
}

export default function FlashcardsReviewPage({ searchParams }: FlashcardsReviewPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Flashcards.FlashcardsReview searchParams={searchParams} />
    </Suspense>
  );
}
