import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Onboarding } from "@modules";

export default function OnboardingRolePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Onboarding.OnboardingRole />
    </Suspense>
  );
}
