export type NotificationTiming = "immediate" | "offset";

/** One row of `/admin/notification-settings` — the system-wide switchboard for a notification type. */
export interface NotificationPolicyEntry {
  type: string;
  group: string;
  isScheduled: boolean;
  enabled: boolean;
  channels: string[];
  recipientRules: string[];
  timing: NotificationTiming;
  offsetMinutes: number | null;
}
