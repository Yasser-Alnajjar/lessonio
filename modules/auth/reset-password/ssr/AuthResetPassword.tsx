import { AuthShell } from "../../components/auth-shell";
import { ResetPasswordForm } from "../csr/ResetPasswordForm";

/**
 * No signed-in redirect here, unlike the other three auth pages: a user
 * lands on this route via the recovery email link, and the Supabase browser
 * client establishes a temporary recovery session client-side to complete
 * the flow. `proxy.ts` treats this route as always-public for that reason.
 */
export const AuthResetPassword = async () => {
  return (
    <AuthShell>
      <ResetPasswordForm />
    </AuthShell>
  );
};
