import { z } from "zod";

type Translator = (key: string) => string;

export function createJoinClassSchema(t: Translator) {
  return z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6}$/, t("errors.codeInvalid")),
  });
}
