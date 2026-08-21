"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";

import { login } from "@/actions/auth.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { OAuthButtons } from "@/components/shared/oauth-buttons";
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
import { Link, useRouter } from "@/i18n/navigation";
import { createLoginSchema } from "@/lib/validations/auth";
import type { LoginInput } from "@/lib/types/auth";
import { getSafeRedirectPath } from "@/lib/utils";

export const LoginForm = () => {
  const t = useTranslations("auth.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => createLoginSchema(t), [t]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (result) => {
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      const destination = getSafeRedirectPath(
        searchParams.get("next"),
        "/home",
      );
      router.push(destination);
      router.refresh();
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
        {searchParams.get("error") === "oauth" && (
          <p role="alert" className="text-destructive mb-4 text-sm font-medium">
            {t("oauthError")}
          </p>
        )}

        <Form {...form}>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("passwordLabel")}</FormLabel>
                    <Link
                      href="/auth/forgot-password"
                      className="text-primary text-xs font-medium hover:underline"
                    >
                      {t("forgotPassword")}
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder={t("passwordPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <p role="alert" className="text-destructive text-sm font-medium">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="mt-2"
            >
              {mutation.isPending ? <LessonioSpinner /> : <LogIn />}
              {mutation.isPending ? t("submitting") : t("submit")}
            </Button>
          </form>
        </Form>

        <div className="mt-6">
          <OAuthButtons next={searchParams.get("next") ?? undefined} />
        </div>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {t("noAccount")}{" "}
          <Link
            href="/auth/register"
            className="text-primary font-medium hover:underline"
          >
            {t("registerLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};
