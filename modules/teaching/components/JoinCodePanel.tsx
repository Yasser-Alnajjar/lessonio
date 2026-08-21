"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, Copy, RefreshCw } from "lucide-react";

import { rotateJoinCode } from "@/actions/teacher-classes.mutations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface JoinCodePanelProps {
  classId: string;
  code: string;
  onRotated?: (newCode: string) => void;
}

export function JoinCodePanel({
  classId,
  code,
  onRotated,
}: JoinCodePanelProps) {
  const t = useTranslations("teaching.roster.joinCode");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => rotateJoinCode(classId),
    onSuccess: (result) => {
      if (result.data) onRotated?.(result.data);
    },
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground">
        {t("label")}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-2xl font-semibold tracking-widest text-foreground">
          {code}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={handleCopy}
          aria-label={t("copy")}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          aria-label={t("rotate")}
        >
          <RefreshCw
            className={cn("size-4", mutation.isPending && "animate-spin")}
          />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      {mutation.data?.error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {mutation.data.error}
        </p>
      )}
    </div>
  );
}
