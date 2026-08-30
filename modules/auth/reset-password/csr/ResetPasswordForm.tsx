"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, KeyRound } from "lucide-react";

import { resetPassword } from "@/actions/auth.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRouter } from "@/i18n/navigation";
import { createResetPasswordSchema } from "@/lib/validations/auth";
import type { ResetPasswordInput } from "@/lib/types/auth";

const REDIRECT_DELAY_MS = 1500;

export const ResetPasswordForm = () => {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [formError, setFormError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const schema = useMemo(() => createResetPasswordSchema(t), [t]);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!succeeded) return;
    const timeout = setTimeout(() => {
      router.push("/auth/login");
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [succeeded, router]);

  const onSubmit = form.handleSubmit((values) => {
    if (!token || !email) return;
    setFormError(null);
    startTransition(async () => {
      const result = await resetPassword(values, { token, email });
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setSucceeded(true);
    });
  });

  // Laravel's reset link is `/auth/reset-password?token=...&email=...`
  // (API_CONTRACT.md AUTH-008) — without both, there's nothing to submit.
  if (!token || !email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p role="alert" className="text-destructive text-sm font-medium">
            {t("invalidLink")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {succeeded ? (
          <div className="border-success/30 bg-success/10 flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
            <CheckCircle2 className="text-success h-8 w-8" />
            <p className="text-foreground text-sm font-medium">
              {t("success")}
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passwordLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("passwordPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("confirmPasswordLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("confirmPasswordPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {formError && (
                <p
                  role="alert"
                  className="text-destructive text-sm font-medium"
                >
                  {formError}
                </p>
              )}

              <Button type="submit" disabled={isPending} className="mt-2">
                {isPending ? <LessonioSpinner /> : <KeyRound />}
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};
