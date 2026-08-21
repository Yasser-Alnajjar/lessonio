import { z } from "zod";

import { APP_ROLES } from "@/lib/types/user";

/**
 * Auth forms build their schema at render time via `useTranslations`, so
 * every message below is a lookup key into the `auth.*.errors` namespace
 * rather than a hardcoded string. Keep this the single source of truth for
 * shape + rules; `src/lib/types/auth.ts` infers its types from these.
 */
type Translator = (key: string) => string;

export function createLoginSchema(t: Translator) {
  return z.object({
    email: z.email({ message: t("errors.emailInvalid") }),
    password: z.string().min(1, t("errors.passwordRequired")),
  });
}

export function createRegisterSchema(t: Translator) {
  return z
    .object({
      role: z.enum(APP_ROLES, { message: t("errors.roleRequired") }),
      fullName: z
        .string()
        .trim()
        .min(2, t("errors.fullNameMin"))
        .max(80, t("errors.fullNameMax")),
      email: z.email({ message: t("errors.emailInvalid") }),
      password: z.string().min(8, t("errors.passwordMin")),
      confirmPassword: z.string().min(1, t("errors.confirmPasswordMin")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("errors.passwordMismatch"),
      path: ["confirmPassword"],
    });
}

export function createForgotPasswordSchema(t: Translator) {
  return z.object({
    email: z.email({ message: t("errors.emailInvalid") }),
  });
}

export function createResetPasswordSchema(t: Translator) {
  return z
    .object({
      password: z.string().min(8, t("errors.passwordMin")),
      confirmPassword: z.string().min(1, t("errors.confirmPasswordMin")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("errors.passwordMismatch"),
      path: ["confirmPassword"],
    });
}

export function createUpdateProfileSchema(t: Translator) {
  return z.object({
    fullName: z
      .string()
      .trim()
      .min(2, t("errors.fullNameMin"))
      .max(80, t("errors.fullNameMax")),
    timezone: z.string().min(1, t("errors.timezoneRequired")),
  });
}
