"use client";

import { useOffline } from "next/offline";

import useTranslate from "@/hooks/useTranslate";

export function PageLoader() {
  const isOffline = useOffline();
  const t = useTranslate("offline");

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3">
      <div
        className="border-muted-foreground/30 border-t-foreground h-8 w-8 animate-spin rounded-full border-2"
        role="status"
        aria-label={isOffline ? t("waitingForConnection") : "Loading"}
      />
      {isOffline && (
        <p className="text-muted-foreground text-sm">
          {t("waitingForConnection")}
        </p>
      )}
    </div>
  );
}
