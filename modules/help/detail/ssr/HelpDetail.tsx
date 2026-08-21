import { notFound } from "next/navigation";

import { getHelpTopic } from "@/lib/help/content";
import { HelpDetailView } from "../csr/HelpDetailView";

interface HelpDetailProps {
  params: Promise<{ topic: string }>;
}

export const HelpDetail = async ({ params }: HelpDetailProps) => {
  const { topic } = await params;

  if (!getHelpTopic(topic)) {
    notFound();
  }

  return <HelpDetailView slug={topic} />;
};
