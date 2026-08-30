import "server-only";

import { axios } from "@/lib/client";
import { parseGradeScale } from "@/lib/grades/scale";
import { parseNotificationPreferences } from "@/lib/notifications/preferences";
import type { ActionResult, Json } from "@/lib/types/common";
import type { Skin, ThemeMode, UserSettings } from "@/lib/types/settings";
import { SKINS, THEME_MODES } from "@/lib/types/settings";
import {
  deleteAccount,
  exportData,
  updateGradeScale,
  updateNotificationPreferences,
  updateSkin,
} from "./settings.mutations";

interface BackendSettings {
  userId: string;
  theme: string;
  skin: string;
  locale: string;
  notificationPreferences: Json;
  gradeScale: Json;
}

function toThemeMode(value: string): ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value)
    ? (value as ThemeMode)
    : "system";
}

function toSkin(value: string): Skin {
  return (SKINS as readonly string[]).includes(value)
    ? (value as Skin)
    : "default";
}

export const settingsActions = {
  async get(): Promise<ActionResult<UserSettings>> {
    try {
      const { data } = await axios.get<{ data: BackendSettings | null }>(
        "/api/v1/settings",
      );
      if (!data.data) {
        return { data: null, error: null };
      }

      const row = data.data;
      return {
        data: {
          userId: row.userId,
          theme: toThemeMode(row.theme),
          skin: toSkin(row.skin),
          locale: row.locale,
          notificationPreferences: parseNotificationPreferences(
            row.notificationPreferences,
          ),
          gradeScale: parseGradeScale(row.gradeScale),
        },
        error: null,
      };
    } catch {
      return { data: null, error: null };
    }
  },

  updateNotificationPreferences,
  updateGradeScale,
  updateSkin,
  exportData,
  deleteAccount,
};
