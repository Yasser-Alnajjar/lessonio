import {
  XP_BONUS_EXAM_ACE,
  XP_LEVEL_BASE,
  XP_PER_COMPLETED_HOMEWORK,
  XP_PER_COMPLETED_LESSON,
  XP_PER_SCORED_EXAM,
  XP_PER_STUDY_HOUR,
  XP_PER_UNLOCKED_ACHIEVEMENT,
} from "@/lib/constants/gamification";

export interface XpCounts {
  completedLessons: number;
  studyMinutes: number;
  completedHomework: number;
  scoredExams: number;
  aceExams: number;
  unlockedAchievements: number;
}

export function computeXp(counts: XpCounts): number {
  return (
    counts.completedLessons * XP_PER_COMPLETED_LESSON +
    Math.floor(counts.studyMinutes / 60) * XP_PER_STUDY_HOUR +
    counts.completedHomework * XP_PER_COMPLETED_HOMEWORK +
    counts.scoredExams * XP_PER_SCORED_EXAM +
    counts.aceExams * XP_BONUS_EXAM_ACE +
    counts.unlockedAchievements * XP_PER_UNLOCKED_ACHIEVEMENT
  );
}

/** level = floor(sqrt(xp / base)) + 1, so the threshold for level L is (L-1)^2 * base. */
export function computeLevel(xp: number): { level: number; xpToNextLevel: number } {
  const level = Math.floor(Math.sqrt(xp / XP_LEVEL_BASE)) + 1;
  const nextLevelThreshold = level * level * XP_LEVEL_BASE;
  return { level, xpToNextLevel: nextLevelThreshold - xp };
}
