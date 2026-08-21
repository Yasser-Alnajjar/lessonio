import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Help } from "@modules";

export default function HelpGlossaryPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Help.HelpGlossary />
    </Suspense>
  );
}
