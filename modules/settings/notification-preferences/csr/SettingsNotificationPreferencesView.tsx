"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { BellRing } from "lucide-react";

import { updateNotificationPreferences } from "@/actions/settings.mutations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useBrowserNotifications } from "@/hooks/use-browser-notifications";
import useTranslate from "@/hooks/useTranslate";
import { useRouter } from "@/i18n/navigation";
import { groupNotificationTypes } from "@/lib/notifications/groups";
import { NOTIFICATION_TYPES } from "@/lib/types/notification";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type NotificationTypePreference,
  type UserSettings,
} from "@/lib/types/settings";
import { createNotificationPreferencesSchema } from "@/lib/validations/notification-preferences";
import { SettingsNav } from "../../components/SettingsNav";

interface SettingsNotificationPreferencesViewProps {
  data: UserSettings | null;
}

const TYPE_GROUPS = groupNotificationTypes(NOTIFICATION_TYPES);

export const SettingsNotificationPreferencesView = ({
  data,
}: SettingsNotificationPreferencesViewProps) => {
  const t = useTranslate("notifications.preferences");
  const tTypes = useTranslate("notifications.types");
  const tGroups = useTranslate("notifications.groups");
  const router = useRouter();
  const { supported, permission, requestPermission } =
    useBrowserNotifications();

  const schema = useMemo(() => createNotificationPreferencesSchema(), []);
  const form = useForm<NotificationPreferences>({
    resolver: zodResolver(schema),
    defaultValues:
      data?.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
  });

  const [status, setStatus] = useState<{
    kind: "saved" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateNotificationPreferences(values);
      if (result.success) {
        setStatus({ kind: "saved", message: t("saved") });
        router.refresh();
      } else {
        setStatus({
          kind: "error",
          message: result.error ?? t("genericError"),
        });
      }
    });
  });

  const permissionMessage = !supported
    ? t("permissionUnsupported")
    : permission === "granted"
      ? t("permissionGranted")
      : permission === "denied"
        ? t("permissionDenied")
        : t("permissionPrompt");

  return (
    <div className="flex justify-center">
      <div className="flex flex-col gap-4 w-full max-w-2xl mt-4">
        <SettingsNav />

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

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold">{t("channelsTitle")}</h2>

              <FormField
                control={form.control}
                name="channels"
                render={({ field }) => (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <Label htmlFor="pref-browser">
                          {t("browserLabel")}
                        </Label>
                        <p className="text-muted-foreground text-sm">
                          {t("browserDescription")}
                        </p>
                        <p className="text-muted-foreground/80 text-xs">
                          {permissionMessage}
                        </p>
                      </div>
                      <Switch
                        id="pref-browser"
                        checked={field.value.in_app}
                        onCheckedChange={(checked) =>
                          field.onChange({ ...field.value, in_app: checked })
                        }
                      />
                    </div>

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
                        checked={field.value.email}
                        onCheckedChange={(checked) =>
                          field.onChange({ ...field.value, email: checked })
                        }
                      />
                    </div>
                  </>
                )}
              />
            </section>

            <Separator />

            <FormField
              control={form.control}
              name="types"
              render={({ field }) => (
                <div className="flex flex-col gap-6">
                  {Array.from(TYPE_GROUPS.entries()).map(([group, types]) => (
                    <section key={group} className="flex flex-col gap-3">
                      <h2 className="text-sm font-semibold">
                        {tGroups(group)}
                      </h2>

                      {types.map((type) => {
                        const value: NotificationTypePreference =
                          field.value[type];
                        return (
                          <FormItem
                            key={type}
                            className="flex items-center justify-between gap-4"
                          >
                            <FormLabel className="font-normal">
                              {tTypes(type)}
                            </FormLabel>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5">
                                <FormControl>
                                  <Checkbox
                                    id={`pref-type-${type}-in_app`}
                                    checked={value.in_app}
                                    onCheckedChange={(checked) =>
                                      field.onChange({
                                        ...field.value,
                                        [type]: {
                                          ...value,
                                          in_app: checked === true,
                                        },
                                      })
                                    }
                                  />
                                </FormControl>
                                <Label
                                  htmlFor={`pref-type-${type}-in_app`}
                                  className="text-muted-foreground text-xs font-normal"
                                >
                                  {t("channelInApp")}
                                </Label>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Checkbox
                                  id={`pref-type-${type}-email`}
                                  checked={value.email}
                                  onCheckedChange={(checked) =>
                                    field.onChange({
                                      ...field.value,
                                      [type]: {
                                        ...value,
                                        email: checked === true,
                                      },
                                    })
                                  }
                                />
                                <Label
                                  htmlFor={`pref-type-${type}-email`}
                                  className="text-muted-foreground text-xs font-normal"
                                >
                                  {t("channelEmail")}
                                </Label>
                              </div>
                            </div>
                          </FormItem>
                        );
                      })}
                    </section>
                  ))}
                </div>
              )}
            />

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!data || isPending}>
                {isPending ? t("saving") : t("save")}
              </Button>
              {status && (
                <p
                  role="status"
                  className={
                    status.kind === "error"
                      ? "text-destructive text-sm"
                      : "text-sm"
                  }
                >
                  {status.message}
                </p>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};
