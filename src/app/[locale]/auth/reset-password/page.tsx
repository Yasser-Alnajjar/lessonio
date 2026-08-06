import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Auth } from "@modules";

export default function AuthResetPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Auth.AuthResetPassword />
    </Suspense>
  );
}
