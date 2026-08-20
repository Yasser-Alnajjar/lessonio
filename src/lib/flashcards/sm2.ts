/**
 * SM-2 (SuperMemo 1987) spaced-repetition scheduler. The review UI offers 4
 * grades (Again/Hard/Good/Easy) rather than SM-2's raw 0-5 quality scale —
 * the same simplification Anki-style apps use — mapped via GRADE_TO_QUALITY.
 */

export type FlashcardGrade = "again" | "hard" | "good" | "easy";

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  dueDate: string; // ISO date, "2026-08-20"
}

export const INITIAL_SM2_STATE: Sm2State = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

export const GRADE_TO_QUALITY: Record<FlashcardGrade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

const MIN_EASE_FACTOR = 1.3;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Applies one graded review to the card's SM-2 state, returning the new state and next due date. */
export function applySm2(state: Sm2State, grade: FlashcardGrade, today: Date = new Date()): Sm2Result {
  const quality = GRADE_TO_QUALITY[grade];

  let repetitions: number;
  let intervalDays: number;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = state.repetitions + 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(state.intervalDays * state.easeFactor);
    }
  }

  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    repetitions,
    dueDate: toIsoDate(dueDate),
  };
}
