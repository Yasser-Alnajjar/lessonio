import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { StudySessions } from "@modules";

export default function StudySessionsFocusPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <StudySessions.StudySessionsFocus />
    </Suspense>
  );
}
