"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  getRecentNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type RecentNotifications,
} from "@/actions/notifications.mutations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationIcon } from "@/components/ui-system/notification-icon";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import { Link, useRouter } from "@/i18n/navigation";
import {
  renderNotificationBody,
  renderNotificationTitle,
} from "@/lib/notifications/render";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/types/common";
import type { Notification } from "@/lib/types/notification";

/** How often the bell re-checks for new notifications. */
const POLL_INTERVAL_MS = 60_000;
/** How many rows the dropdown itself renders (the query returns up to 10). */
const VISIBLE_LIMIT = 10;

interface NotificationBellProps {
  /** From the user's saved preferences — gates the OS popup, not the dropdown. */
  browserNotificationsEnabled: boolean;
}

export function NotificationBell({
  browserNotificationsEnabled,
}: NotificationBellProps) {
  const t = useTranslations("notifications.bell");
  const tContent = useTranslations("notifications");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const { permission, showNotification, markAsShown } =
    useBrowserNotifications();

  const [data, setData] = useState<ActionResult<RecentNotifications> | null>(
    null,
  );
  const [isMarkingAllRead, startMarkAllReadTransition] = useTransition();

  const refresh = useCallback(() => {
    getRecentNotifications().then(setData);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const items = data?.data?.items ?? [];
  const unreadCount = data?.data?.unreadCount ?? 0;
  const isLoading = data === null;
  const hasError = data !== null && data.data === null;

  const markRead = (id: string) => {
    markNotificationAsRead(id).then(refresh);
  };

  const markAllRead = () => {
    startMarkAllReadTransition(async () => {
      await markAllNotificationsAsRead();
      refresh();
    });
  };

  // The first poll of a session establishes the baseline instead of firing
  // popups — otherwise signing in after a few days away would produce a burst
  // of desktop notifications for things already visible in the list.
  const primed = useRef(false);

  useEffect(() => {
    if (!data?.data) return;

    const unread = data.data.items.filter((item) => item.readAt === null);

    if (!primed.current) {
      primed.current = true;
      markAsShown(unread.map((item) => item.id));
      return;
    }

    if (!browserNotificationsEnabled || permission !== "granted") return;

    for (const item of unread) {
      showNotification({
        id: item.id,
        title: renderNotificationTitle(tContent, item),
        body: renderNotificationBody(tContent, item),
        onClick: () => router.push(item.linkPath ?? "/notifications/center"),
      });
    }
  }, [
    data,
    tContent,
    browserNotificationsEnabled,
    permission,
    showNotification,
    markAsShown,
    router,
  ]);

  const handleSelect = (notification: Notification) => {
    if (notification.readAt === null) {
      markRead(notification.id);
    }
    router.push(notification.linkPath ?? "/notifications/center");
  };
  const unreadItems = items
    .slice(0, VISIBLE_LIMIT)
    .filter((notification) => notification.readAt === null);

  const readItems = items
    .slice(0, VISIBLE_LIMIT)
    .filter((notification) => notification.readAt !== null);

  const sections = [
    { label: t("unread"), items: unreadItems },
    { label: t("read"), items: readItems },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={
            unreadCount > 0
              ? t("unreadLabel", { count: unreadCount })
              : t("label")
          }
        >
          <Bell />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className={cn(
                "bg-primary text-primary-foreground absolute top-1 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums",
                isArabic ? "left-1" : "right-1",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={isArabic ? "start" : "end"} className="w-80">
        <DropdownMenuLabel
          className="flex items-center justify-between gap-2"
          dir={isArabic ? "rtl" : "ltr"}
        >
          <span>{t("heading")}</span>
          {unreadCount > 0 && (
            <Button
              type="button"
              onClick={markAllRead}
              disabled={isMarkingAllRead}
              size="sm"
              variant="ghost"
              className="disabled:opacity-50"
            >
              {t("markAllRead")}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            {t("loading")}
          </p>
        ) : hasError ? (
          <p
            role="alert"
            className="text-destructive px-2 py-6 text-center text-sm"
          >
            {t("loadError")}
          </p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">
            {t("empty")}
          </p>
        ) : (
          sections.map(
            ({ label, items: sectionItems }) =>
              sectionItems.length > 0 && (
                <React.Fragment key={label}>
                  <DropdownMenuLabel dir={isArabic ? "rtl" : "ltr"}>
                    {label}
                  </DropdownMenuLabel>

                  {sectionItems.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      dir={isArabic ? "rtl" : "ltr"}
                      onSelect={() => handleSelect(notification)}
                      className={cn(
                        "cursor-pointer items-start gap-2.5 py-2",
                        notification.readAt === null
                          ? "bg-accent/40"
                          : "bg-card focus:bg-card opacity-80",
                      )}
                    >
                      <NotificationIcon type={notification.type} />

                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={cn(
                            "truncate text-sm",
                            notification.readAt === null
                              ? "font-bold"
                              : "font-medium",
                          )}
                        >
                          {renderNotificationTitle(tContent, notification)}
                        </span>

                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {renderNotificationBody(tContent, notification)}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </React.Fragment>
              ),
          )
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/notifications/center"
            className="cursor-pointer justify-center text-sm"
          >
            {t("viewAll")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
