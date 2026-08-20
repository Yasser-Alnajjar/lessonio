import { Actions } from "@/actions";
import { FlashcardsDeckView } from "../csr/FlashcardsDeckView";

export const FlashcardsDeck = async () => {
  const { data } = await Actions.Flashcards.getDecks();

  return <FlashcardsDeckView decks={data ?? []} />;
};
