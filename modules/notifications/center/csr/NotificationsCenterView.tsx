"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Mail, Settings2 } from "lucide-react";
import { useFormatter, useLocale } from "next-intl";

import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  sendNotificationToEmail,
} from "@/actions/notifications.mutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui-system/empty-state";
import { NotificationIcon } from "@/components/ui-system/notification-icon";
import useTranslate from "@/hooks/useTranslate";
import { Link, useRouter } from "@/i18n/navigation";
import {
  renderNotificationBody,
  renderNotificationTitle,
} from "@/lib/notifications/render";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/notification";

interface NotificationsCenterViewProps {
  data: Notification[];
  loadError?: boolean;
}

type Tab = "all" | "unread";
type GroupKey = "today" | "yesterday" | "older";

/** Buckets by calendar day in the viewer's own timezone, newest group first. */
function groupByDay(
  notifications: Notification[],
): [GroupKey, Notification[]][] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: Record<GroupKey, Notification[]> = {
    today: [],
    yesterday: [],
    older: [],
  };

  for (const notification of notifications) {
    const createdAt = new Date(notification.createdAt);
    if (createdAt >= startOfToday) groups.today.push(notification);
    else if (createdAt >= startOfYesterday) groups.yesterday.push(notification);
    else groups.older.push(notification);
  }

  return (Object.entries(groups) as [GroupKey, Notification[]][]).filter(
    ([, items]) => items.length > 0,
  );
}

export const NotificationsCenterView = ({
  data,
  loadError = false,
}: NotificationsCenterViewProps) => {
  const t = useTranslate("notifications");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const format = useFormatter();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("all");
  const [emailedId, setEmailedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingRead, startMarkReadTransition] = useTransition();
  const [isMarkingAllRead, startMarkAllReadTransition] = useTransition();
  const [isEmailing, startEmailTransition] = useTransition();

  const unreadCount = data.filter((item) => item.readAt === null).length;

  const groups = useMemo(() => {
    const visible =
      tab === "unread" ? data.filter((item) => item.readAt === null) : data;
    return groupByDay(visible);
  }, [data, tab]);

  /** The server-rendered list goes stale on a write; the bell picks up the change on its next poll. */
  const refresh = () => router.refresh();

  const markRead = (id: string) => {
    startMarkReadTransition(async () => {
      await markNotificationAsRead(id);
      refresh();
    });
  };

  const markAllRead = () => {
    startMarkAllReadTransition(async () => {
      await markAllNotificationsAsRead();
      refresh();
    });
  };

  const email = (id: string) => {
    startEmailTransition(async () => {
      try {
        const result = await sendNotificationToEmail(id);
        if (result.success) {
          setError(null);
          setEmailedId(id);
          refresh();
        } else {
          setEmailedId(null);
          setError(result.error ?? t("center.genericError"));
        }
      } catch {
        setError(t("center.genericError"));
      }
    });
  };

  const handleOpen = (notification: Notification) => {
    if (notification.readAt === null) markRead(notification.id);
    if (notification.linkPath) router.push(notification.linkPath);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t("center.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("center.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/notification-preferences">
              <Settings2 />
              {t("center.settingsLink")}
            </Link>
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              disabled={isMarkingAllRead}
            >
              <Check />
              {t("center.markAllRead")}
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <TabsList>
          <TabsTrigger value="all">{t("center.tabAll")}</TabsTrigger>
          <TabsTrigger value="unread">
            {t("center.tabUnread")}
            {unreadCount > 0 && ` (${unreadCount})`}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      {loadError && (
        <p role="alert" className="text-destructive text-sm">
          {t("center.loadError")}
        </p>
      )}

      {groups.length === 0 ? (
        <EmptyState
          variant={data.length === 0 ? "no-data" : "no-results"}
          title={
            data.length === 0
              ? t("center.emptyTitle")
              : t("center.emptyUnreadTitle")
          }
          description={
            data.length === 0
              ? t("center.emptyDescription")
              : t("center.emptyUnreadDescription")
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([group, items]) => (
            <section key={group} className="flex flex-col gap-2">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t(`center.${group}`)}
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((notification) => {
                  const isUnread = notification.readAt === null;

                  return (
                    <li
                      key={notification.id}
                      className={cn(
                        "border-border flex items-start gap-3 rounded-xl border p-3 transition-colors",
                        isUnread ? "bg-accent/40" : "bg-card",
                      )}
                    >
                      <NotificationIcon type={notification.type} />

                      <button
                        type="button"
                        onClick={() => handleOpen(notification)}
                        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-start"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-sm",
                              isUnread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {renderNotificationTitle(t, notification)}
                          </span>
                          <Badge variant="outline" className="font-normal">
                            {t(`types.${notification.type}`)}
                          </Badge>
                          {isUnread && (
                            <Badge variant="default" className="font-normal">
                              {t("center.unread")}
                            </Badge>
                          )}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {renderNotificationBody(t, notification)}
                        </span>
                        <span className="text-muted-foreground/70 text-xs">
                          {format.dateTime(new Date(notification.createdAt), {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        {isUnread && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("center.markRead")}
                            title={t("center.markRead")}
                            onClick={() => markRead(notification.id)}
                            disabled={isMarkingRead}
                          >
                            <Check />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("center.emailMe")}
                          title={
                            emailedId === notification.id
                              ? t("center.emailSent")
                              : t("center.emailMe")
                          }
                          onClick={() => email(notification.id)}
                          disabled={isEmailing}
                          className={cn(
                            emailedId === notification.id && "text-primary",
                          )}
                        >
                          <Mail />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
