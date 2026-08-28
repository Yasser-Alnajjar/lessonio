import fs from "node:fs/promises";
import path from "node:path";
import { Markdown } from "@/components/ui/markdown";

const page = async () => {
  const filePath = path.join(process.cwd(), "docs/API_CONTRACT.md");
  const content = await fs.readFile(filePath, "utf8");

  return <Markdown content={content} />;
};

export default page;
