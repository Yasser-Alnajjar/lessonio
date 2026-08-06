import type { AuditFields, UUID } from "./common";

export const GOAL_PERIODS = ["weekly", "monthly"] as const;
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

export interface Goal extends AuditFields {
  id: UUID;
  userId: UUID;
  period: GoalPeriod;
  targetMinutes: number;
  achievedMinutes: number;
  periodStart: string; // ISO date
}
