import { getLocale } from "next-intl/server";

import { Actions } from "@/actions";
import { redirect } from "@/i18n/navigation";
import { AuthShell } from "../../components/auth-shell";
import { ForgotPasswordForm } from "../csr/ForgotPasswordForm";

/**
 * Defense in depth: `proxy.ts` already redirects a signed-in user away from
 * this route, but SSR checks again in case the client navigated here via
 * the App Router cache rather than a fresh request through the middleware.
 */
export const AuthForgotPassword = async () => {
  const { data: user } = await Actions.Auth.getSession();

  if (user) {
    const locale = await getLocale();
    redirect({ href: "/home", locale });
  }

  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
};
