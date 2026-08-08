import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Subjects } from "@modules";

export default function SubjectsListPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Subjects.SubjectsList />
    </Suspense>
  );
}
