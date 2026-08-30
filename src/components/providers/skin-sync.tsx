"use client";

import { useEffect } from "react";

import type { Skin } from "@/lib/types/settings";

interface SkinSyncProps {
  skin: Skin | null;
}

/**
 * Reconciles the DB-saved skin with the `skin` cookie that drives
 * `<html data-skin>` in the root layout. Needed the first time a user signs
 * in on a browser that has never set that cookie — without this, the app
 * would silently fall back to the default skin until they revisit
 * Settings > Appearance and click a swatch again.
 */
export function SkinSync({ skin }: SkinSyncProps) {
  useEffect(() => {
    if (!skin) return;

    const current = document.documentElement.getAttribute("data-skin");
    if (current === skin) return;

    document.documentElement.setAttribute("data-skin", skin);
    document.cookie = `skin=${skin}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, [skin]);

  return null;
}
