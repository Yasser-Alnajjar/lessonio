import { AuthShell } from "../../components/auth-shell";
import { ResetPasswordForm } from "../csr/ResetPasswordForm";

/**
 * No signed-in redirect here, unlike the other three auth pages: a user
 * lands on this route via the recovery email link with `token`/`email`
 * query params (API_CONTRACT.md AUTH-008), which `ResetPasswordForm` reads
 * directly — there's no session to check yet. `proxy.ts` treats this route
 * as always-public for that reason.
 */
export const AuthResetPassword = async () => {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
};
