import { z } from "zod";

import { APP_ROLES } from "@/lib/types/user";

type Translator = (key: string) => string;

export function createChangeRoleSchema(t: Translator) {
  return z.object({
    role: z.enum(APP_ROLES, { message: t("errors.roleRequired") }),
  });
}
