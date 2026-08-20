import type { Weekday } from "@/lib/types/class";
import { WEEKDAYS } from "@/lib/types/class";

/** Translation key (under the `classes.days` namespace) for each `Weekday` value. */
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
