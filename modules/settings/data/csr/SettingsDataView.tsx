"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { exportData } from "@/actions/settings.mutations";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { UserSettings } from "@/lib/types/settings";
import { SettingsNav } from "../../components/SettingsNav";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

interface SettingsDataViewProps {
  data: UserSettings | null;
  email: string | null;
}

function downloadJson(payload: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SettingsDataView = ({ data, email }: SettingsDataViewProps) => {
  const t = useTranslations("settings.data");
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    setExportError(null);
    startTransition(async () => {
      try {
        const result = await exportData();
        if (!result.data) {
          setExportError(result.error ?? t("exportError"));
          return;
        }
        downloadJson(
          result.data,
          `study-line-backup-${result.data.exportedAt.slice(0, 10)}.json`,
        );
      } catch {
        setExportError(t("exportError"));
      }
    });
  };

  return (
    <div className="flex justify-center">
      <div className="mt-4 flex w-full max-w-2xl flex-col gap-4">
        <SettingsNav />

        <div>
          <h1 className="text-foreground text-xl font-semibold">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>

        {!data && (
          <p role="alert" className="text-destructive text-sm">
            {t("missingSettings")}
          </p>
        )}

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">{t("exportTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("exportDescription")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={!data || isPending}
              onClick={handleExport}
            >
              {isPending ? <LessonioSpinner /> : <Download />}
              {isPending ? t("exportPreparing") : t("exportButton")}
            </Button>
            {exportError && (
              <p role="alert" className="text-destructive text-sm">
                {exportError}
              </p>
            )}
          </div>
        </section>

        <Separator />

        <section className="border-destructive/30 flex flex-col gap-3 rounded-lg border p-4">
          <div>
            <h2 className="text-destructive text-sm font-semibold">
              {t("dangerTitle")}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t("dangerDescription")}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-fit"
            disabled={!email}
            onClick={() => setDeleteOpen(true)}
          >
            {t("deleteButton")}
          </Button>
        </section>

        {email && (
          <DeleteAccountDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            email={email}
          />
        )}
      </div>
    </div>
  );
};
