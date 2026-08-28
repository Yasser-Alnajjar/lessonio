"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";

import { updateProfile } from "@/actions/auth.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { createUpdateProfileSchema } from "@/lib/validations/auth";
import type { UpdateProfileInput } from "@/lib/types/auth";
import type { User } from "@/lib/types/user";
import { SettingsNav } from "../../components/SettingsNav";

interface SettingsProfileViewProps {
  data: User | null;
}

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "Europe/London",
  "Asia/Dubai",
];

function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

function initialsOf(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const initials = parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
    if (initials) return initials.toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export const SettingsProfileView = ({ data }: SettingsProfileViewProps) => {
  const t = useTranslations("settings.profile");
  const router = useRouter();
  const locale = useLocale();
  const isArabic = locale === "ar";

  const [status, setStatus] = useState<{
    kind: "saved" | "error";
    message: string;
  } | null>(null);

  const timezones = useMemo(() => supportedTimezones(), []);
  const schema = useMemo(() => createUpdateProfileSchema(t), [t]);
  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: data?.fullName ?? "",
      timezone: data?.timezone ?? browserTimezone,
    },
  });

  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await updateProfile(values);
        if (result.success) {
          setStatus({ kind: "saved", message: t("saved") });
          router.refresh();
        } else {
          setStatus({
            kind: "error",
            message: result.error ?? t("genericError"),
          });
        }
      } catch {
        setStatus({ kind: "error", message: t("genericError") });
      }
    });
  });

  return (
    <div className="flex justify-center">
      <div className="mt-4 flex w-full max-w-2xl flex-col gap-4">
        <SettingsNav />

        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        {!data && (
          <p role="alert" className="text-destructive text-sm">
            {t("missingProfile")}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarImage src={data?.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>
              {initialsOf(data?.fullName ?? null, data?.email ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <Label>{t("emailLabel")}</Label>
            <p className="text-foreground text-sm">{data?.email}</p>
            <p className="text-muted-foreground/80 text-xs">{t("emailNote")}</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fullNameLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("fullNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("timezoneLabel")}</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      dir={isArabic ? "rtl" : "ltr"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("timezonePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((timezone) => (
                          <SelectItem key={timezone} value={timezone}>
                            {timezone.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    {t("timezoneDescription")}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={!data || isPending}
                className="w-fit"
              >
                {isPending && <LessonioSpinner />}
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
