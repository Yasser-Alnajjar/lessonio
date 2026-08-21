"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { leaveClass } from "@/actions/enrollments.mutations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import { EmptyState } from "@/components/ui-system/empty-state";
import { useRouter } from "@/i18n/navigation";
import type { EnrolledClass } from "@/lib/types/enrollment";
import { JoinClassDialog } from "../../components/JoinClassDialog";

interface ClassroomClassesViewProps {
  classes: EnrolledClass[];
}

export const ClassroomClassesView = ({
  classes,
}: ClassroomClassesViewProps) => {
  const t = useTranslations("classroom.classes");
  const router = useRouter();

  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<EnrolledClass | null>(null);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setJoinOpen(true)}>
          <UserPlus />
          {t("joinClass")}
        </Button>
      </div>

      {classes.length === 0 ? (
        <EmptyState
          variant="no-data"
          title={t("empty.title")}
          description={t("empty.description")}
          action={{
            label: t("empty.action"),
            onClick: () => setJoinOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {classes.map((item) => (
            <Card key={item.teacherClassId} className="gap-3">
              <CardHeader>
                <h3 className="truncate text-sm font-medium text-foreground">
                  {item.name}
                </h3>
                {item.subjectLabel && (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.subjectLabel}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs text-muted-foreground">
                {item.teacherName && (
                  <span>{t("taughtBy", { name: item.teacherName })}</span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => setLeaveTarget(item)}
                >
                  {t("leave")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <JoinClassDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={() => router.refresh()}
      />

      <ConfirmDialog
        open={Boolean(leaveTarget)}
        onOpenChange={(open) => {
          if (!open) setLeaveTarget(null);
        }}
        title={t("leaveDialog.title")}
        description={t("leaveDialog.description", {
          name: leaveTarget?.name ?? "",
        })}
        confirmLabel={t("leaveDialog.confirm")}
        cancelLabel={t("leaveDialog.cancel")}
        variant="destructive"
        onConfirm={async () => {
          if (!leaveTarget) return;
          const result = await leaveClass(leaveTarget.teacherClassId);
          if (!result.success) {
            throw new Error(result.error || t("leaveDialog.genericError"));
          }
          setLeaveTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
};
