"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Wraps the browser Notification API.
 *
 * Two things make this more than a thin wrapper:
 *
 * 1. `Notification` doesn't exist during SSR or in insecure/unsupported
 *    contexts, so every access is guarded and `permission` starts as "denied"
 *    until the effect confirms otherwise — rendering a value the server
 *    couldn't produce would desync hydration.
 * 2. The bell polls the same rows every 60s. Without a record of what's
 *    already been shown, every poll would re-pop every unread notification,
 *    so shown ids are persisted to localStorage and survive a reload.
 */

const SEEN_STORAGE_KEY = "study-line:notified-ids";
/** Keeps the stored id list from growing without bound. */
const SEEN_LIMIT = 200;

type PermissionState = NotificationPermission;

function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    // Private-mode quota errors and malformed JSON both land here; an empty
    // set just means a notification may pop a second time, never a crash.
    return new Set();
  }
}

function writeSeen(ids: Set<string>): void {
  try {
    window.localStorage.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify([...ids].slice(-SEEN_LIMIT)),
    );
  } catch {
    // Storage unavailable — degrade to in-memory only for this session.
  }
}

export interface ShowNotificationInput {
  id: string;
  title: string;
  body: string;
  onClick?: () => void;
}

interface Support {
  supported: boolean;
  permission: PermissionState;
}

export function useBrowserNotifications() {
  // Kept as one object so the mount-time read is a single state write — the
  // server can't know either value, so both are resolved together.
  const [{ supported, permission }, setSupport] = useState<Support>({
    supported: false,
    permission: "denied",
  });

  useEffect(() => {
    if (!isSupported()) return;
    // Hydration guard: reading `Notification` during render would produce
    // markup the server could never match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport({ supported: true, permission: Notification.permission });
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported()) return "denied" as PermissionState;

    const result = await Notification.requestPermission();
    setSupport({ supported: true, permission: result });
    return result;
  }, []);

  /**
   * Shows a notification unless this id has been shown before. Returns whether
   * one was actually displayed.
   */
  const showNotification = useCallback(
    ({ id, title, body, onClick }: ShowNotificationInput): boolean => {
      if (!isSupported() || Notification.permission !== "granted") return false;

      const seen = readSeen();
      if (seen.has(id)) return false;

      seen.add(id);
      writeSeen(seen);

      const notification = new Notification(title, { body, tag: id });
      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
        };
      }

      return true;
    },
    [],
  );

  /**
   * Marks ids as already-shown without displaying anything. The bell calls
   * this on its first poll so a user who has been away doesn't get a burst of
   * popups for notifications they can already see in the list.
   */
  const markAsShown = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const seen = readSeen();
    for (const id of ids) seen.add(id);
    writeSeen(seen);
  }, []);

  return { supported, permission, requestPermission, showNotification, markAsShown };
}
