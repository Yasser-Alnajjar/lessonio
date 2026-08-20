import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Flashcards } from "@modules";

export default function FlashcardsDeckPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Flashcards.FlashcardsDeck />
    </Suspense>
  );
}
