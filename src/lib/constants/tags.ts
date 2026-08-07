import { SUBJECT_COLOR_OPTIONS } from "@/lib/constants/subjects";

/** Tags don't expose a color picker — a color is assigned deterministically from the name. */
export function colorForTagName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SUBJECT_COLOR_OPTIONS[hash % SUBJECT_COLOR_OPTIONS.length]!;
}
