import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageLoader } from "@/components/shared/page-loader";
import { Help } from "@modules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help.meta");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function HelpListPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Help.HelpList />
    </Suspense>
  );
}
