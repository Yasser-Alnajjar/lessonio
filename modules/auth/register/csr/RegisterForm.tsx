"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, UserPlus } from "lucide-react";

import { register } from "@/actions/auth.mutations";
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
import { Link } from "@/i18n/navigation";
import { createRegisterSchema } from "@/lib/validations/auth";
import type { RegisterInput } from "@/lib/types/auth";

export const RegisterForm = () => {
  const t = useTranslations("auth.register");
  const [formError, setFormError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const schema = useMemo(() => createRegisterSchema(t), [t]);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (result) => {
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      setSucceeded(true);
      form.reset();
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
            <p className="text-foreground text-sm font-medium">{t("success")}</p>
            <Link href="/auth/login" className="text-primary text-sm font-medium hover:underline">
              {t("loginLink")}
            </Link>
          </div>
        ) : (
          <>
            <Form {...form}>
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fullNameLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="name"
                          placeholder={t("fullNamePlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  <p role="alert" className="text-destructive text-sm font-medium">
                    {formError}
                  </p>
                )}

                <Button type="submit" disabled={mutation.isPending} className="mt-2">
                  {mutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <UserPlus />
                  )}
                  {mutation.isPending ? t("submitting") : t("submit")}
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <OAuthButtons />
            </div>

            <p className="text-muted-foreground mt-6 text-center text-sm">
              {t("haveAccount")}{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                {t("loginLink")}
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
