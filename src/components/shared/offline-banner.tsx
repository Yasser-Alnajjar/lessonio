"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

import useTranslate from "@/hooks/useTranslate";

export function OfflineBanner() {
  const isOffline = useOffline();
  const t = useTranslate("offline");

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-highlighter text-highlighter-foreground flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium"
    >
      <WifiOff className="size-4 shrink-0" />
      {t("banner")}
    </div>
  );
}
