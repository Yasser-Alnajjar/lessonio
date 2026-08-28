"use client";

import { useState, useTransition } from "react";

import { updateGradeScale } from "@/actions/settings.mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui-system/callout";
import { Link, useRouter } from "@/i18n/navigation";
import useTranslate from "@/hooks/useTranslate";
import { DEFAULT_GRADE_SCALE, type GradeScaleEntry } from "@/lib/types/grade";
import { SettingsNav } from "../../components/SettingsNav";

interface SettingsGradesViewProps {
  scale: GradeScaleEntry[] | null;
}

function isValidScale(scale: GradeScaleEntry[]): boolean {
  return scale.every((entry, index) => {
    const inRange =
      entry.minPercent >= 0 && entry.minPercent <= 100 && entry.gradePoints >= 0 && entry.gradePoints <= 4.3;
    if (!inRange) return false;
    const previous = scale[index - 1];
    return index === 0 || !previous || entry.minPercent < previous.minPercent;
  });
}

export const SettingsGradesView = ({ scale: initialScale }: SettingsGradesViewProps) => {
  const t = useTranslate("settings.grades");
  const tHelp = useTranslate("help");
  const router = useRouter();

  const [scale, setScale] = useState<GradeScaleEntry[]>(initialScale ?? DEFAULT_GRADE_SCALE);
  const [status, setStatus] = useState<{ kind: "saved" | "error"; message: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      try {
        const result = await updateGradeScale(scale);
        if (result.success) {
          setStatus({ kind: "saved", message: t("saved") });
          router.refresh();
        } else {
          setStatus({ kind: "error", message: result.error ?? t("genericError") });
        }
      } catch {
        setStatus({ kind: "error", message: t("genericError") });
      }
    });
  };

  const updateEntry = (index: number, patch: Partial<GradeScaleEntry>) => {
    setStatus(null);
    setScale((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const valid = isValidScale(scale);

  return (
    <div className="flex justify-center">
      <div className="mt-4 flex w-full max-w-2xl flex-col gap-4">
        <SettingsNav />

        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Callout variant="note" title={tHelp("topics.grades.title")}>
          <p>{tHelp("topics.grades.whatIsIt")}</p>
          <Link href="/help/detail/grades" className="mt-1 inline-block font-medium">
            {tHelp("ui.learnMore")}
          </Link>
        </Callout>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[3rem_1fr_1fr] items-center gap-3 text-xs font-medium text-muted-foreground">
            <span>{t("letterHeader")}</span>
            <span>{t("minPercentHeader")}</span>
            <span>{t("gradePointsHeader")}</span>
          </div>

          {scale.map((entry, index) => {
            const isFloor = index === scale.length - 1;
            return (
              <div key={entry.letter} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{entry.letter}</span>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`min-${entry.letter}`} className="sr-only">
                    {t("minPercentHeader")} {entry.letter}
                  </Label>
                  <Input
                    id={`min-${entry.letter}`}
                    type="number"
                    min={0}
                    max={100}
                    disabled={isFloor}
                    value={entry.minPercent}
                    onChange={(event) => updateEntry(index, { minPercent: event.target.valueAsNumber })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`points-${entry.letter}`} className="sr-only">
                    {t("gradePointsHeader")} {entry.letter}
                  </Label>
                  <Input
                    id={`points-${entry.letter}`}
                    type="number"
                    min={0}
                    max={4.3}
                    step={0.1}
                    value={entry.gradePoints}
                    onChange={(event) => updateEntry(index, { gradePoints: event.target.valueAsNumber })}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {!valid && (
          <p role="alert" className="text-sm text-destructive">
            {t("invalidScale")}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="button" onClick={save} disabled={!valid || isPending}>
            {isPending ? t("saving") : t("save")}
          </Button>
          {status && (
            <p role="status" className={status.kind === "error" ? "text-sm text-destructive" : "text-sm"}>
              {status.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
