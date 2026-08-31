import { Suspense } from "react";
import type { Metadata } from "next";

import { Actions } from "@/actions";
import { PageLoader } from "@/components/shared/page-loader";
import { privatePageMetadata } from "@/lib/seo";
import { Admin } from "@modules";

interface AdminUserDetailPageProps {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({
  params,
}: AdminUserDetailPageProps): Promise<Metadata> {
  const { userId } = await params;
  const { data: user } = await Actions.Admin.getUserById(userId);

  return privatePageMetadata(
    user ? (user.fullName ?? user.email) : "User",
    user ? `Admin detail view for ${user.email}.` : undefined,
  );
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  const { userId } = await params;

  return (
    <Suspense fallback={<PageLoader />}>
      <Admin.AdminUserDetail userId={userId} />
    </Suspense>
  );
}
