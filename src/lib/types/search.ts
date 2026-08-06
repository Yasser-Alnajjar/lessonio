import type { UUID } from "./common";

export type SearchResultKind = "subject" | "lesson" | "teacher" | "note" | "tag";

export interface SearchResultItem {
  id: UUID;
  kind: SearchResultKind;
  title: string;
  subtitle: string | null;
  path: string;
}
