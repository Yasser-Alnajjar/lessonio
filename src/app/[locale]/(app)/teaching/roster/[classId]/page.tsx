import { Suspense } from "react";
import type { Metadata } from "next";

import { Actions } from "@/actions";
import { PageLoader } from "@/components/shared/page-loader";
import { privatePageMetadata } from "@/lib/seo";
import { Teaching } from "@modules";

interface TeachingRosterPageProps {
  params: Promise<{ classId: string }>;
}

export async function generateMetadata({
  params,
}: TeachingRosterPageProps): Promise<Metadata> {
  const { classId } = await params;
  const { data: _class } = await Actions.TeacherClasses.getById(classId);

  return privatePageMetadata(
    _class ? `${_class.name} roster` : "Class roster",
    _class ? `Private roster for ${_class.name}.` : undefined,
  );
}

export default function TeachingRosterPage({
  params,
}: TeachingRosterPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Teaching.TeachingRoster params={params} />
    </Suspense>
  );
}
