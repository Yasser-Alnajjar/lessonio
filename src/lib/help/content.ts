import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Compass,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Layers,
  ListChecks,
  NotebookText,
  Percent,
  Rocket,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { GlossaryTerm } from "@/lib/help/glossary";

export type HelpSection =
  | "gettingStarted"
  | "dailyUse"
  | "progress"
  | "journeys"
  | "troubleshooting";

/**
 * "overview": a concept-tour page (may render concept cards + flow diagram).
 * "feature": the What/Why/When/How/After/Connects template for one real feature.
 * "journey": a goal-oriented walkthrough ("I want to do X").
 * "faq": an accordion of question/answer pairs.
 */
export type HelpTopicType = "overview" | "feature" | "journey" | "faq";

export type HelpStatusGroup =
  | "attendance"
  | "examStatus"
  | "studyStatus"
  | "reviewStatus"
  | "homeworkStatus"
  | "goalPeriod"
  | "notificationType";

export interface HelpTopic {
  slug: string;
  type: HelpTopicType;
  section: HelpSection;
  icon: LucideIcon;
  /** Slugs of other topics worth reading next. */
  relatedTopics?: string[];
  /** The real in-app page this topic's "Ready to do this?" CTA links to. */
  relatedFeatureHref?: string;
  /** Status vocabularies to render as explainer cards on this topic. */
  statusGroups?: HelpStatusGroup[];
}

export const HELP_SECTIONS: HelpSection[] = [
  "gettingStarted",
  "dailyUse",
  "progress",
  "journeys",
  "troubleshooting",
];

export const HELP_TOPICS: HelpTopic[] = [
  // Getting started
  {
    slug: "welcome",
    type: "overview",
    section: "gettingStarted",
    icon: Rocket,
    relatedTopics: ["how-it-works", "first-steps"],
  },
  {
    slug: "how-it-works",
    type: "overview",
    section: "gettingStarted",
    icon: Compass,
    relatedTopics: ["subjects", "classes", "class-occurrences", "study-sessions"],
  },
  {
    slug: "first-steps",
    type: "journey",
    section: "gettingStarted",
    icon: ListChecks,
    relatedTopics: ["subjects", "classes", "lessons", "study-sessions"],
  },

  // Daily use — one per real feature
  {
    slug: "subjects",
    type: "feature",
    section: "dailyUse",
    icon: BookOpen,
    relatedFeatureHref: "/subjects/list",
    relatedTopics: ["classes", "lessons"],
  },
  {
    slug: "classes",
    type: "feature",
    section: "dailyUse",
    icon: CalendarClock,
    relatedFeatureHref: "/classes/list",
    relatedTopics: ["class-occurrences", "subjects"],
  },
  {
    slug: "class-occurrences",
    type: "feature",
    section: "dailyUse",
    icon: CalendarDays,
    relatedFeatureHref: "/classes/list",
    statusGroups: ["attendance", "examStatus"],
    relatedTopics: ["classes", "lessons", "missed-a-class"],
  },
  {
    slug: "lessons",
    type: "feature",
    section: "dailyUse",
    icon: NotebookText,
    relatedFeatureHref: "/lessons/list",
    statusGroups: ["studyStatus", "reviewStatus", "homeworkStatus"],
    relatedTopics: ["subjects", "class-occurrences", "homework", "exams", "flashcards"],
  },
  {
    slug: "study-sessions",
    type: "feature",
    section: "dailyUse",
    icon: Timer,
    relatedFeatureHref: "/study-sessions/focus",
    relatedTopics: ["goals-achievements", "statistics", "lessons"],
  },
  {
    slug: "homework",
    type: "feature",
    section: "dailyUse",
    icon: ClipboardList,
    relatedFeatureHref: "/homework/list",
    relatedTopics: ["lessons"],
  },
  {
    slug: "exams",
    type: "feature",
    section: "dailyUse",
    icon: GraduationCap,
    relatedFeatureHref: "/exams/list",
    relatedTopics: ["lessons", "grades"],
  },
  {
    slug: "flashcards",
    type: "feature",
    section: "dailyUse",
    icon: Layers,
    relatedFeatureHref: "/flashcards/deck",
    relatedTopics: ["lessons"],
  },
  {
    slug: "calendar",
    type: "feature",
    section: "dailyUse",
    icon: CalendarDays,
    relatedFeatureHref: "/calendar/month",
    relatedTopics: ["classes", "lessons", "homework", "exams"],
  },
  {
    slug: "notifications",
    type: "feature",
    section: "dailyUse",
    icon: Bell,
    relatedFeatureHref: "/notifications/center",
    statusGroups: ["notificationType"],
    relatedTopics: ["classes", "homework"],
  },

  // Tracking progress
  {
    slug: "statistics",
    type: "feature",
    section: "progress",
    icon: BarChart3,
    relatedFeatureHref: "/statistics/overview",
    relatedTopics: ["study-sessions", "grades"],
  },
  {
    slug: "grades",
    type: "feature",
    section: "progress",
    icon: Percent,
    relatedFeatureHref: "/grades/overview",
    relatedTopics: ["exams", "subjects"],
  },
  {
    slug: "goals-achievements",
    type: "feature",
    section: "progress",
    icon: Trophy,
    relatedFeatureHref: "/gamification/goals",
    statusGroups: ["goalPeriod"],
    relatedTopics: ["study-sessions", "statistics"],
  },

  // Common tasks / journeys
  {
    slug: "first-week",
    type: "journey",
    section: "journeys",
    icon: Rocket,
    relatedTopics: ["welcome", "how-it-works", "first-steps"],
  },
  {
    slug: "add-first-subject-and-class",
    type: "journey",
    section: "journeys",
    icon: BookOpen,
    relatedTopics: ["subjects", "classes"],
  },
  {
    slug: "record-attendance",
    type: "journey",
    section: "journeys",
    icon: CalendarDays,
    relatedTopics: ["class-occurrences"],
  },
  {
    slug: "start-studying",
    type: "journey",
    section: "journeys",
    icon: Timer,
    relatedTopics: ["study-sessions", "lessons"],
  },
  {
    slug: "track-homework-and-exams",
    type: "journey",
    section: "journeys",
    icon: ClipboardList,
    relatedTopics: ["homework", "exams"],
  },
  {
    slug: "know-what-to-study-today",
    type: "journey",
    section: "journeys",
    icon: LayoutDashboard,
    relatedTopics: ["calendar", "lessons"],
  },
  {
    slug: "missed-a-class",
    type: "journey",
    section: "journeys",
    icon: CalendarClock,
    relatedTopics: ["class-occurrences"],
  },
  {
    slug: "review-past-activity",
    type: "journey",
    section: "journeys",
    icon: Timer,
    relatedTopics: ["study-sessions", "calendar", "statistics"],
  },
  {
    slug: "change-something-earlier",
    type: "journey",
    section: "journeys",
    icon: NotebookText,
    relatedTopics: ["subjects", "lessons", "classes"],
  },

  // Troubleshooting
  {
    slug: "troubleshooting",
    type: "faq",
    section: "troubleshooting",
    icon: HelpCircle,
  },
];

/**
 * The concept cards shown on the "how-it-works" overview topic. These reuse
 * the glossary's copy (`help.glossary.terms.<term>`) so a concept is never
 * explained twice with two different wordings.
 */
export const HOW_IT_WORKS_CONCEPTS: readonly GlossaryTerm[] = [
  "subject",
  "class",
  "classOccurrence",
  "lesson",
  "studySession",
  "homework",
  "exam",
  "grade",
  "flashcard",
  "goal",
  "achievement",
  "notification",
];

export function getHelpTopic(slug: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.slug === slug);
}

export function getTopicsBySection(section: HelpSection): HelpTopic[] {
  return HELP_TOPICS.filter((topic) => topic.section === section);
}

export function getRelatedTopics(topic: HelpTopic): HelpTopic[] {
  if (!topic.relatedTopics?.length) return [];
  return topic.relatedTopics
    .map((slug) => getHelpTopic(slug))
    .filter((t): t is HelpTopic => Boolean(t));
}
