import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageLoader } from "@/components/shared/page-loader";
import { getHelpTopic } from "@/lib/help/content";
import { privatePageMetadata } from "@/lib/seo";
import { Help } from "@modules";

interface HelpDetailPageProps {
  params: Promise<{ locale: string; topic: string }>;
}

export async function generateMetadata({
  params,
}: HelpDetailPageProps): Promise<Metadata> {
  const { locale, topic } = await params;
  const helpTopic = getHelpTopic(topic);
  if (!helpTopic) return privatePageMetadata("Help");

  const t = await getTranslations({ locale, namespace: "help.topics" });
  return privatePageMetadata(
    t(`${helpTopic.slug}.title`),
    t(`${helpTopic.slug}.summary`),
  );
}

export default function HelpDetailPage({ params }: HelpDetailPageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Help.HelpDetail params={params} />
    </Suspense>
  );
}
