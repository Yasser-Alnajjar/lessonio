import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Auth } from "@modules";

export default function AuthForgotPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Auth.AuthForgotPassword />
    </Suspense>
  );
}
