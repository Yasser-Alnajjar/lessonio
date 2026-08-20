import { attachmentsActions } from "./attachments";
import { authActions } from "./auth";
import { calendarActions } from "./calendar";
import { classSchedulesActions } from "./class-schedules";
import { dashboardActions } from "./dashboard";
import { examsActions } from "./exams";
import { flashcardsActions } from "./flashcards";
import { gamificationActions } from "./gamification";
import { gradesActions } from "./grades";
import { homeworkActions } from "./homework";
import { lessonsActions } from "./lessons";
import { notesActions } from "./lesson-notes";
import { notificationsActions } from "./notifications";
import { searchActions } from "./search";
import { settingsActions } from "./settings";
import { statisticsActions } from "./statistics";
import { studySessionsActions } from "./study-sessions";
import { subjectsActions } from "./subjects";
import { tagsActions } from "./tags";

/**
 * Single entry point for all data access, per the mandatory architecture:
 * SSR components call `Actions.<Domain>.<method>()` — never `fetch()` directly.
 */
export const Actions = {
  Auth: authActions,
  Dashboard: dashboardActions,
  Subjects: subjectsActions,
  ClassSchedules: classSchedulesActions,
  Lessons: lessonsActions,
  Notes: notesActions,
  Attachments: attachmentsActions,
  Tags: tagsActions,
  Homework: homeworkActions,
  Exams: examsActions,
  Flashcards: flashcardsActions,
  Grades: gradesActions,
  StudySessions: studySessionsActions,
  Calendar: calendarActions,
  Search: searchActions,
  Statistics: statisticsActions,
  Notifications: notificationsActions,
  Gamification: gamificationActions,
  Settings: settingsActions,
};
