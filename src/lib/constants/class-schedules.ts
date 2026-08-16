import type { Weekday } from "@/lib/types/class-schedule";
import { WEEKDAYS } from "@/lib/types/class-schedule";

/** Translation key (under the `classSchedules.days` namespace) for each `Weekday` value. */
export const WEEKDAY_LABEL_KEYS: Record<Weekday, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export { WEEKDAYS };
