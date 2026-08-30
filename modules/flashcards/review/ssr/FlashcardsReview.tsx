import { Actions } from "@/actions";
import { FlashcardsReviewView } from "../csr/FlashcardsReviewView";

interface FlashcardsReviewProps {
  searchParams: Promise<{ subjectId?: string; lessonId?: string }>;
}

export const FlashcardsReview = async ({
  searchParams,
}: FlashcardsReviewProps) => {
  const { subjectId, lessonId } = await searchParams;

  const { data } = await Actions.Flashcards.getDueQueue({
    subjectId,
    lessonId,
  });

  const backHref = lessonId
    ? `/lessons/detail/${lessonId}`
    : "/flashcards/deck";

  return <FlashcardsReviewView cards={data ?? []} backHref={backHref} />;
};
