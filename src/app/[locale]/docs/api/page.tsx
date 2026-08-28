import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { Markdown } from "@/components/ui/markdown";

/**
 * This repository-maintenance reference is public but not product content.
 * It is intentionally excluded from search and the sitemap, and it does not
 * advertise Arabic/English alternates because the Markdown is English-only.
 */
export const metadata: Metadata = {
  title: "API contract",
  description: "Technical API contract for Lessonio.",
  robots: {
    index: false,
    follow: false,
  },
};

const page = async () => {
  const filePath = path.join(process.cwd(), "docs/API_CONTRACT.md");
  const content = await fs.readFile(filePath, "utf8");

  return (
    <div className="max-w-7xl mx-auto p-4" dir="ltr">
      <Markdown content={content} />
    </div>
  );
};

export default page;
