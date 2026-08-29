import type { z } from "zod";

import type {
  createForgotPasswordSchema,
  createLoginSchema,
  createRegisterSchema,
  createResetPasswordSchema,
  createUpdateProfileSchema,
} from "@/lib/validations/auth";

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ForgotPasswordInput = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>;
export type ResetPasswordInput = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;
export type UpdateProfileInput = z.infer<
  ReturnType<typeof createUpdateProfileSchema>
>;

/** OAuth provider IDs, matching the backend's `auth/oauth/{provider}` routes — "azure" is Microsoft (Azure AD). */
export type OAuthProvider = "google" | "azure";
