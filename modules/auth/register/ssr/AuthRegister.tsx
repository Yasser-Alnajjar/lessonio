import { getLocale } from "next-intl/server";

import { Actions } from "@/actions";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "../../components/auth-shell";
import { RegisterForm } from "../csr/RegisterForm";

/**
 * Defense in depth: `proxy.ts` already redirects a signed-in user away from
 * this route, but SSR checks again in case the client navigated here via
 * the App Router cache rather than a fresh request through the middleware.
 */
export const AuthRegister = async () => {
  const { data: user } = await Actions.Auth.getSession();

  if (user) {
    const locale = await getLocale();
    redirect({ href: "/dashboard/overview", locale });
  }

  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
};
