import { Suspense } from "react";
import { PageLoader } from "@/components/shared/page-loader";
import { Classes } from "@modules";

export default function ClassesListPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Classes.ClassesList />
    </Suspense>
  );
}
