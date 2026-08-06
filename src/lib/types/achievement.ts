import type { UUID } from "./common";

export interface Achievement {
  id: UUID;
  key: string; // stable identifier, e.g. "streak-7"
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number; // 0-100, for achievements with partial progress
}
