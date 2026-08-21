/**
 * Every application-specific term a student might not know, in the order
 * they're introduced conceptually (root concepts first). Copy for each term
 * lives in i18n under `help.glossary.<term>.*`.
 */
export const GLOSSARY_TERMS = [
  "subject",
  "class",
  "classOccurrence",
  "lesson",
  "studySession",
  "focusTimer",
  "homework",
  "exam",
  "grade",
  "gpa",
  "flashcard",
  "spacedRepetition",
  "goal",
  "streak",
  "xp",
  "level",
  "achievement",
  "notification",
] as const;

export type GlossaryTerm = (typeof GLOSSARY_TERMS)[number];

/** Which other glossary terms are worth reading next from this one. */
export const GLOSSARY_RELATIONS: Record<GlossaryTerm, GlossaryTerm[]> = {
  subject: ["class", "lesson"],
  class: ["classOccurrence", "subject"],
  classOccurrence: ["class", "lesson"],
  lesson: ["subject", "classOccurrence", "homework", "exam", "flashcard"],
  studySession: ["focusTimer", "goal", "streak", "xp"],
  focusTimer: ["studySession"],
  homework: ["lesson"],
  exam: ["lesson", "grade", "gpa"],
  grade: ["exam", "gpa"],
  gpa: ["grade", "subject"],
  flashcard: ["lesson", "spacedRepetition"],
  spacedRepetition: ["flashcard"],
  goal: ["studySession", "streak"],
  streak: ["studySession", "goal"],
  xp: ["level", "achievement"],
  level: ["xp"],
  achievement: ["xp", "streak"],
  notification: ["class", "homework", "lesson"],
};
