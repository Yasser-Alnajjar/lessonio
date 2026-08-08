import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Homework } from "@modules";

export default function HomeworkListPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Homework.HomeworkList />
    </Suspense>
  );
}
