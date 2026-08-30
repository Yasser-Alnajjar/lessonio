import type { Metadata } from "next";
import type { ReactNode } from "react";

import { defaultLocale, type AppLocale } from "@/i18n/routing";

const fallbackSiteUrl = "http://localhost:3000";

/**
 * The deployed origin is configured once and reused by metadata routes so
 * canonicals, hreflang links, robots, and the sitemap cannot drift apart.
 */
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_APP_URL ?? fallbackSiteUrl,
);

export function localizedPath(locale: AppLocale, path = "/"): string {
  const normalizedPath = path === "/" ? "" : path;
  return (
    `${locale === defaultLocale ? "" : `/${locale}`}${normalizedPath}` || "/"
  );
}

export function localizedAlternates(
  locale: AppLocale,
  path = "/",
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      ar: localizedPath("ar", path),
      en: localizedPath("en", path),
      "x-default": localizedPath(defaultLocale, path),
    },
  };
}

export function localeOpenGraph(locale: AppLocale) {
  return {
    locale: locale === "ar" ? "ar_EG" : "en_US",
    alternateLocale: locale === "ar" ? "en_US" : "ar_EG",
  };
}

/**
 * Metadata for authenticated, user-specific screens. It deliberately omits
 * canonicals and social cards: private records must not be discoverable or
 * previewed outside the signed-in experience.
 */
export function privatePageMetadata(
  title: string,
  description?: string,
): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

type PrivateScreen =
  | "adminNotificationSettings"
  | "calendarMonth"
  | "classesList"
  | "classroomAssignments"
  | "classroomClasses"
  | "dashboard"
  | "exams"
  | "flashcardDeck"
  | "flashcardReview"
  | "achievements"
  | "goals"
  | "grades"
  | "helpGlossary"
  | "home"
  | "homework"
  | "lessons"
  | "notifications"
  | "onboarding"
  | "search"
  | "appearance"
  | "dataSettings"
  | "gradeSettings"
  | "notificationSettings"
  | "profile"
  | "statistics"
  | "focusTimer"
  | "studyHistory"
  | "subjects"
  | "teachingAssignments"
  | "teachingClasses"
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword";

const privateScreenCopy: Record<
  AppLocale,
  Record<PrivateScreen, { title: string; description: string }>
> = {
  en: {
    adminNotificationSettings: {
      title: "Notification settings",
      description: "Manage system-wide notification policies.",
    },
    calendarMonth: {
      title: "Calendar",
      description: "Your private study calendar.",
    },
    classesList: {
      title: "Classes",
      description: "Your private class schedule.",
    },
    classroomAssignments: {
      title: "Assignments",
      description: "Assignments shared with you.",
    },
    classroomClasses: {
      title: "My classes",
      description: "Classes you have joined.",
    },
    dashboard: {
      title: "Dashboard",
      description: "Your private study overview.",
    },
    exams: {
      title: "Exams",
      description: "Your private exam schedule and results.",
    },
    flashcardDeck: {
      title: "Flashcards",
      description: "Your private flashcard decks.",
    },
    flashcardReview: {
      title: "Review flashcards",
      description: "Your private flashcard review session.",
    },
    achievements: {
      title: "Achievements",
      description: "Your private learning achievements.",
    },
    goals: { title: "Goals", description: "Your private study goals." },
    grades: {
      title: "Grades",
      description: "Your private grades and academic progress.",
    },
    helpGlossary: {
      title: "Glossary",
      description: "Lessonio terms and definitions.",
    },
    home: { title: "Home", description: "Your private Lessonio workspace." },
    homework: { title: "Homework", description: "Your private homework list." },
    lessons: { title: "Lessons", description: "Your private lesson library." },
    notifications: {
      title: "Notifications",
      description: "Your private Lessonio notifications.",
    },
    onboarding: {
      title: "Choose your role",
      description: "Set up your private Lessonio account.",
    },
    search: {
      title: "Search",
      description: "Search your private Lessonio data.",
    },
    appearance: {
      title: "Appearance",
      description: "Manage your display preferences.",
    },
    dataSettings: {
      title: "Your data",
      description: "Manage your private Lessonio data.",
    },
    gradeSettings: {
      title: "Grade settings",
      description: "Manage your grade scale preferences.",
    },
    notificationSettings: {
      title: "Notification preferences",
      description: "Manage your notification preferences.",
    },
    profile: { title: "Profile", description: "Manage your private profile." },
    statistics: {
      title: "Statistics",
      description: "Your private study statistics.",
    },
    focusTimer: {
      title: "Focus timer",
      description: "Start a private study session.",
    },
    studyHistory: {
      title: "Study history",
      description: "Your private study-session history.",
    },
    subjects: {
      title: "Subjects",
      description: "Your private subjects and progress.",
    },
    teachingAssignments: {
      title: "Teaching assignments",
      description: "Manage your private class assignments.",
    },
    teachingClasses: {
      title: "Teaching classes",
      description: "Manage your private classes.",
    },
    login: { title: "Log in", description: "Log in to your Lessonio account." },
    register: {
      title: "Create account",
      description: "Create your Lessonio account.",
    },
    forgotPassword: {
      title: "Forgot password",
      description: "Request a Lessonio password reset.",
    },
    resetPassword: {
      title: "Reset password",
      description: "Set a new Lessonio password.",
    },
  },
  ar: {
    adminNotificationSettings: {
      title: "إعدادات الإشعارات",
      description: "أدر سياسات الإشعارات على مستوى النظام.",
    },
    calendarMonth: { title: "التقويم", description: "تقويم دراستك الخاص." },
    classesList: { title: "الحصص", description: "جدول حصصك الخاص." },
    classroomAssignments: {
      title: "الواجبات",
      description: "الواجبات المشتركة معك.",
    },
    classroomClasses: {
      title: "حصصي",
      description: "الحصص التي انضممت إليها.",
    },
    dashboard: {
      title: "لوحة التحكم",
      description: "نظرة عامة خاصة على دراستك.",
    },
    exams: {
      title: "الاختبارات",
      description: "جدول اختباراتك ونتائجك الخاصة.",
    },
    flashcardDeck: {
      title: "البطاقات التعليمية",
      description: "مجموعات بطاقاتك التعليمية الخاصة.",
    },
    flashcardReview: {
      title: "مراجعة البطاقات",
      description: "جلسة مراجعة بطاقاتك التعليمية الخاصة.",
    },
    achievements: {
      title: "الإنجازات",
      description: "إنجازاتك التعليمية الخاصة.",
    },
    goals: { title: "الأهداف", description: "أهداف دراستك الخاصة." },
    grades: { title: "الدرجات", description: "درجاتك وتقدمك الأكاديمي الخاص." },
    helpGlossary: {
      title: "المصطلحات",
      description: "مصطلحات وتعريفات Lessonio.",
    },
    home: { title: "الرئيسية", description: "مساحة Lessonio الخاصة بك." },
    homework: { title: "الواجبات", description: "قائمة واجباتك الخاصة." },
    lessons: { title: "الدروس", description: "مكتبة دروسك الخاصة." },
    notifications: {
      title: "الإشعارات",
      description: "إشعارات Lessonio الخاصة بك.",
    },
    onboarding: {
      title: "اختر دورك",
      description: "أكمل إعداد حساب Lessonio الخاص بك.",
    },
    search: {
      title: "البحث",
      description: "ابحث في بيانات Lessonio الخاصة بك.",
    },
    appearance: {
      title: "المظهر",
      description: "أدر تفضيلات العرض الخاصة بك.",
    },
    dataSettings: {
      title: "بياناتك",
      description: "أدر بيانات Lessonio الخاصة بك.",
    },
    gradeSettings: {
      title: "إعدادات الدرجات",
      description: "أدر تفضيلات مقياس الدرجات.",
    },
    notificationSettings: {
      title: "تفضيلات الإشعارات",
      description: "أدر تفضيلات إشعاراتك.",
    },
    profile: { title: "الملف الشخصي", description: "أدر ملفك الشخصي الخاص." },
    statistics: { title: "الإحصاءات", description: "إحصاءات دراستك الخاصة." },
    focusTimer: {
      title: "مؤقّت التركيز",
      description: "ابدأ جلسة دراسة خاصة.",
    },
    studyHistory: {
      title: "سجل الدراسة",
      description: "سجل جلسات دراستك الخاصة.",
    },
    subjects: {
      title: "المواد الدراسية",
      description: "موادك وتقدمك الدراسي الخاص.",
    },
    teachingAssignments: {
      title: "واجبات التدريس",
      description: "أدر واجبات حصصك الخاصة.",
    },
    teachingClasses: { title: "حصص التدريس", description: "أدر حصصك الخاصة." },
    login: {
      title: "تسجيل الدخول",
      description: "سجّل الدخول إلى حساب Lessonio الخاص بك.",
    },
    register: {
      title: "إنشاء حساب",
      description: "أنشئ حساب Lessonio الخاص بك.",
    },
    forgotPassword: {
      title: "نسيت كلمة المرور",
      description: "اطلب إعادة تعيين كلمة مرور Lessonio.",
    },
    resetPassword: {
      title: "إعادة تعيين كلمة المرور",
      description: "عيّن كلمة مرور جديدة لـ Lessonio.",
    },
  },
};

export function createPrivateMetadata(screen: PrivateScreen) {
  return async ({ params }: { params: Promise<{ locale: string }> }) => {
    const { locale } = await params;
    const copy = privateScreenCopy[locale as AppLocale] ?? privateScreenCopy.en;
    return privatePageMetadata(copy[screen].title, copy[screen].description);
  };
}

export function PrivatePageLayout({ children }: { children: ReactNode }) {
  return children;
}

/** Serialize JSON-LD safely inside a script element. */
export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
