"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";

import { requestPasswordReset } from "@/actions/auth.mutations";
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
import { Link } from "@/i18n/navigation";
import { createForgotPasswordSchema } from "@/lib/validations/auth";
import type { ForgotPasswordInput } from "@/lib/types/auth";

export const ForgotPasswordForm = () => {
  const t = useTranslations("auth.forgotPassword");
  const [formError, setFormError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const schema = useMemo(() => createForgotPasswordSchema(t), [t]);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (input: ForgotPasswordInput) => requestPasswordReset(input),
    onSuccess: (result) => {
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setSucceeded(true);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    mutation.mutate(values);
  });

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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("emailLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder={t("emailPlaceholder")}
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

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="mt-2"
              >
                {mutation.isPending ? <LessonioSpinner /> : <Send />}
                {mutation.isPending ? t("submitting") : t("submit")}
              </Button>
            </form>
          </Form>
        )}

        <Link
          href="/auth/login"
          className="text-muted-foreground hover:text-foreground mt-6 flex items-center justify-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToLogin")}
        </Link>
      </CardContent>
    </Card>
  );
};
