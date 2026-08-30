import {
  Award,
  CheckCircle,
  Clock,
  Flame,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** XP awarded per unit of real activity. Tunable — no derived value depends on the exact numbers. */
export const XP_PER_COMPLETED_LESSON = 10;
export const XP_PER_STUDY_HOUR = 5;
export const XP_PER_COMPLETED_HOMEWORK = 8;
export const XP_PER_SCORED_EXAM = 15;
export const XP_BONUS_EXAM_ACE = 10;
export const XP_PER_UNLOCKED_ACHIEVEMENT = 50;
export const XP_PER_FLASHCARD_REVIEW = 2;

/** Level curve divisor: level = floor(sqrt(xp / base)) + 1. */
export const XP_LEVEL_BASE = 50;

/** Single source of truth for achievements.icon (public.achievements) -> component. */
export const ACHIEVEMENT_ICON_COMPONENTS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  flame: Flame,
  clock: Clock,
  "check-circle": CheckCircle,
  award: Award,
};

/**
 * achievements.key (public.achievements, seeded in 20260807120014_achievements.sql)
 * -> camelCase key under the `gamification.achievements.items` i18n namespace.
 * Title/description are localized client-side by this stable key rather than
 * read from the (English-only) DB row, so the catalog stays bilingual without
 * a schema change.
 */
export const ACHIEVEMENT_I18N_KEYS: Record<string, string> = {
  "first-lesson": "firstLesson",
  "streak-7": "streak7",
  "streak-30": "streak30",
  "hundred-hours": "hundredHours",
  "perfect-attendance": "perfectAttendance",
  "exam-ace": "examAce",
};
