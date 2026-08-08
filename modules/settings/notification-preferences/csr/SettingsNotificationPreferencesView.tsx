"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { updateNotificationPreferences } from "@/actions/settings.mutations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import useTranslate from "@/hooks/useTranslate";
import { useRouter } from "@/i18n/navigation";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "@/lib/types/notification";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type UserSettings,
} from "@/lib/types/settings";

interface SettingsNotificationPreferencesViewProps {
  data: UserSettings | null;
}

export const SettingsNotificationPreferencesView = ({
  data,
}: SettingsNotificationPreferencesViewProps) => {
  const t = useTranslate("notifications.preferences");
  const tTypes = useTranslate("notifications.types");
  const router = useRouter();
  const { supported, permission, requestPermission } =
    useBrowserNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    data?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [status, setStatus] = useState<{
    kind: "saved" | "error";
    message: string;
  } | null>(null);

  const save = useMutation({
    mutationFn: () => updateNotificationPreferences(preferences),
    onSuccess: (result) => {
      if (result.success) {
        setStatus({ kind: "saved", message: t("saved") });
        router.refresh();
      } else {
        setStatus({
          kind: "error",
          message: result.error ?? t("genericError"),
        });
      }
    },
    onError: () => setStatus({ kind: "error", message: t("genericError") }),
  });

  const setType = (type: NotificationType, enabled: boolean) => {
    setStatus(null);
    setPreferences((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: enabled },
    }));
  };

  const permissionMessage = !supported
    ? t("permissionUnsupported")
    : permission === "granted"
      ? t("permissionGranted")
      : permission === "denied"
        ? t("permissionDenied")
        : t("permissionPrompt");

  return (
    <div className="flex  justify-center">
      <div className="flex flex-col gap-4 w-full max-w-2xl mt-4">
        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        {!data && (
          <p role="alert" className="text-destructive text-sm">
            {t("missingSettings")}
          </p>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">{t("channelsTitle")}</h2>

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="pref-browser">{t("browserLabel")}</Label>
              <p className="text-muted-foreground text-sm">
                {t("browserDescription")}
              </p>
              <p className="text-muted-foreground/80 text-xs">
                {permissionMessage}
              </p>
            </div>
            <Switch
              id="pref-browser"
              checked={preferences.enabledInBrowser}
              onCheckedChange={(checked) => {
                setStatus(null);
                setPreferences((prev) => ({
                  ...prev,
                  enabledInBrowser: checked,
                }));
              }}
            />
          </div>

          {/* The saved preference and the browser grant are independent: turning
            the switch on does nothing until the OS-level permission exists. */}
          {supported && permission === "default" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => requestPermission()}
            >
              <BellRing />
              {t("requestPermission")}
            </Button>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="pref-email">{t("emailLabel")}</Label>
              <p className="text-muted-foreground text-sm">
                {t("emailDescription")}
              </p>
            </div>
            <Switch
              id="pref-email"
              checked={preferences.enabledInEmail}
              onCheckedChange={(checked) => {
                setStatus(null);
                setPreferences((prev) => ({
                  ...prev,
                  enabledInEmail: checked,
                }));
              }}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">{t("typesTitle")}</h2>

          {NOTIFICATION_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between gap-4">
              <Label htmlFor={`pref-type-${type}`}>{tTypes(type)}</Label>
              <Switch
                id={`pref-type-${type}`}
                checked={preferences.types[type]}
                onCheckedChange={(checked) => setType(type, checked)}
              />
            </div>
          ))}
        </section>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => save.mutate()}
            disabled={!data || save.isPending}
          >
            {save.isPending ? t("saving") : t("save")}
          </Button>
          {status && (
            <p
              role="status"
              className={
                status.kind === "error" ? "text-destructive text-sm" : "text-sm"
              }
            >
              {status.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
