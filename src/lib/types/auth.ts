import type { z } from "zod";

import type {
  createForgotPasswordSchema,
  createLoginSchema,
  createRegisterSchema,
  createResetPasswordSchema,
} from "@/lib/validations/auth";

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ForgotPasswordInput = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>;
export type ResetPasswordInput = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;
