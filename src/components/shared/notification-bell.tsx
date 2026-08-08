"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  getRecentNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
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
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/notification";

/** How often the bell re-checks for new notifications. */
const POLL_INTERVAL_MS = 60_000;
/** How many rows the dropdown itself renders (the query returns up to 10). */
const VISIBLE_LIMIT = 5;

export const NOTIFICATIONS_QUERY_KEY = ["notifications", "recent"] as const;

interface NotificationBellProps {
  /** From the user's saved preferences — gates the OS popup, not the dropdown. */
  browserNotificationsEnabled: boolean;
}

export function NotificationBell({ browserNotificationsEnabled }: NotificationBellProps) {
  const t = useTranslations("notifications.bell");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { permission, showNotification, markAsShown } = useBrowserNotifications();

  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => getRecentNotifications(),
    refetchInterval: POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  const items = data?.data?.items ?? [];
  const unreadCount = data?.data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });

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
        title: item.title,
        body: item.body,
        onClick: () => router.push(item.linkPath ?? "/notifications/center"),
      });
    }
  }, [data, browserNotificationsEnabled, permission, showNotification, markAsShown, router]);

  const handleSelect = (notification: Notification) => {
    if (notification.readAt === null) {
      markRead.mutate(notification.id);
    }
    router.push(notification.linkPath ?? "/notifications/center");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={unreadCount > 0 ? t("unreadLabel", { count: unreadCount }) : t("label")}
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
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t("heading")}</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-muted-foreground hover:text-foreground text-xs font-normal disabled:opacity-50"
            >
              {t("markAllRead")}
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">{t("empty")}</p>
        ) : (
          items.slice(0, VISIBLE_LIMIT).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onSelect={() => handleSelect(notification)}
              className="cursor-pointer items-start gap-2.5 py-2"
            >
              <NotificationIcon type={notification.type} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    "truncate text-sm",
                    notification.readAt === null ? "font-semibold" : "font-medium",
                  )}
                >
                  {notification.title}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs">
                  {notification.body}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications/center" className="cursor-pointer justify-center text-sm">
            {t("viewAll")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
