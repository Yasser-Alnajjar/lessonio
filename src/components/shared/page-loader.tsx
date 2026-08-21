"use client";

import { useOffline } from "next/offline";

import useTranslate from "@/hooks/useTranslate";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";

export function PageLoader() {
  const isOffline = useOffline();
  const t = useTranslate("offline");

  return (
    <div className="flex min-h-[80vh] w-full flex-col items-center justify-center gap-3">
      <div
        role="status"
        aria-label={isOffline ? t("waitingForConnection") : "Loading"}
      >
        <LessonioSpinner loading={false} className="h-40 w-auto" />
      </div>
      {isOffline && (
        <p className="text-muted-foreground text-sm">
          {t("waitingForConnection")}
        </p>
      )}
    </div>
  );
}
