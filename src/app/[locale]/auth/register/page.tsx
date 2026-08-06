import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Auth } from "@modules";

export default function AuthRegisterPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Auth.AuthRegister />
    </Suspense>
  );
}
