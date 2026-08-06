import { authActions } from "./auth";
import { calendarActions } from "./calendar";
import { dashboardActions } from "./dashboard";
import { examsActions } from "./exams";
import { gamificationActions } from "./gamification";
import { homeworkActions } from "./homework";
import { lessonsActions } from "./lessons";
import { notificationsActions } from "./notifications";
import { searchActions } from "./search";
import { settingsActions } from "./settings";
import { statisticsActions } from "./statistics";
import { studySessionsActions } from "./study-sessions";
import { subjectsActions } from "./subjects";

/**
 * Single entry point for all data access, per the mandatory architecture:
 * SSR components call `Actions.<Domain>.<method>()` — never `fetch()` directly.
 */
export const Actions = {
  Auth: authActions,
  Dashboard: dashboardActions,
  Subjects: subjectsActions,
  Lessons: lessonsActions,
  Homework: homeworkActions,
  Exams: examsActions,
  StudySessions: studySessionsActions,
  Calendar: calendarActions,
  Search: searchActions,
  Statistics: statisticsActions,
  Notifications: notificationsActions,
  Gamification: gamificationActions,
  Settings: settingsActions,
};
