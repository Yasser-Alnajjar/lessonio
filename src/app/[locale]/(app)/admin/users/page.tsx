import { Suspense } from "react";

import { PageLoader } from "@/components/shared/page-loader";
import { Admin } from "@modules";

interface AdminUsersPageProps {
  searchParams: Promise<{ page?: string; q?: string; role?: string }>;
}

export default function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Admin.AdminUsers searchParams={searchParams} />
    </Suspense>
  );
}
