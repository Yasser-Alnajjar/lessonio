import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Admin } from "@modules";

interface AdminTeacherClassesPageProps {
  searchParams: Promise<{ page?: string; q?: string; archived?: string }>;
}

export default function AdminTeacherClassesPage({
  searchParams,
}: AdminTeacherClassesPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Admin.AdminTeacherClasses searchParams={searchParams} />
    </Suspense>
  );
}
