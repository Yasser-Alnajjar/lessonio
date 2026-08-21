import { getLocale } from "next-intl/server";
import type { Route } from "next";

import { Actions } from "@/actions";
import { redirect } from "@/i18n/navigation";
import { ROLE_HOME } from "@/lib/constants/navigation";
import { OnboardingRoleForm } from "../csr/OnboardingRoleForm";

/**
 * Defense in depth, same reasoning as `AuthLogin`/`AuthRegister`: a user who
 * already has a role bounces to their home instead of re-onboarding, in
 * case they reached this route via the App Router cache.
 */
export const OnboardingRole = async () => {
  const { data: user } = await Actions.Auth.getSession();

  if (user?.role) {
    const locale = await getLocale();
    redirect({ href: ROLE_HOME[user.role] as Route, locale });
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-8">
      <OnboardingRoleForm />
    </div>
  );
};
