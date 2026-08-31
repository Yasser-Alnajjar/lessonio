"use client";

import { format } from "date-fns";
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Presentation,
  ShieldAlert,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { StatisticCard } from "@/components/ui-system/statistic-card";
import type { AdminOverview } from "@/lib/types/admin";
import { AdminNav } from "../../components/AdminNav";
import { useDateFnsLocale } from "../../components/date-format";
import { JobStatusChart } from "./job-status-chart";
import { SignupTrendChart } from "./signup-trend-chart";

interface AdminOverviewViewProps {
  data: AdminOverview | null;
}

export function AdminOverviewView({ data }: AdminOverviewViewProps) {
  const t = useTranslations("admin.overview");
  const dateLocale = useDateFnsLocale();

  if (!data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <AdminNav />
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      </div>
    );
  }

  const { users, content, engagement, notificationJobs } = data;

  const tile = (key: string, label: string, value: number, suffix?: string) => ({
    key,
    label,
    value,
    suffix,
  });

  return (
    <div className="flex flex-col gap-6 p-4">
      <AdminNav />

      <div>
        <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("users.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatisticCard
            stat={tile("total", t("users.total"), users.total)}
            icon={<Users className="size-4" />}
          />
          <StatisticCard
            stat={tile("students", t("users.students"), users.students)}
            icon={<BookOpen className="size-4" />}
          />
          <StatisticCard
            stat={tile("teachers", t("users.teachers"), users.teachers)}
            icon={<Presentation className="size-4" />}
          />
          <StatisticCard
            stat={tile("admins", t("users.admins"), users.admins)}
            icon={<ShieldAlert className="size-4" />}
          />
          <StatisticCard
            stat={tile("unassigned", t("users.unassigned"), users.unassigned)}
          />
          <StatisticCard
            stat={tile(
              "newLast7Days",
              t("users.newLast7Days"),
              users.newLast7Days,
            )}
            icon={<UserPlus className="size-4" />}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("content.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <StatisticCard
            stat={tile(
              "teacherClasses",
              t("content.teacherClasses"),
              content.teacherClasses,
            )}
          />
          <StatisticCard
            stat={tile(
              "archivedTeacherClasses",
              t("content.archivedTeacherClasses"),
              content.archivedTeacherClasses,
            )}
          />
          <StatisticCard
            stat={tile(
              "assignments",
              t("content.assignments"),
              content.assignments,
            )}
            icon={<ClipboardCheck className="size-4" />}
          />
          <StatisticCard
            stat={tile(
              "publishedAssignments",
              t("content.publishedAssignments"),
              content.publishedAssignments,
            )}
          />
          <StatisticCard
            stat={tile(
              "submissions",
              t("content.submissions"),
              content.submissions,
            )}
          />
          <StatisticCard
            stat={tile("lessons", t("content.lessons"), content.lessons)}
          />
          <StatisticCard
            stat={tile("subjects", t("content.subjects"), content.subjects)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t("engagement.title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <StatisticCard
            stat={tile(
              "runningStudySessions",
              t("engagement.runningStudySessions"),
              engagement.runningStudySessions,
            )}
            icon={<Activity className="size-4" />}
          />
          <StatisticCard
            stat={tile(
              "studyMinutesLast7Days",
              t("engagement.studyMinutesLast7Days"),
              engagement.studyMinutesLast7Days,
              "min",
            )}
            icon={<Timer className="size-4" />}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SignupTrendChart signupTrend={data.signupTrend} />
        <JobStatusChart stats={notificationJobs} />
      </div>

      {notificationJobs.oldestPendingScheduledAt && (
        <p className="text-xs text-muted-foreground">
          {t("notificationJobs.oldestPending")}:{" "}
          {format(
            new Date(notificationJobs.oldestPendingScheduledAt),
            "MMM d, yyyy p",
            { locale: dateLocale },
          )}
        </p>
      )}
    </div>
  );
}
