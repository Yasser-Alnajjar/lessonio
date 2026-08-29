"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, CopyIcon, Trash2Icon } from "lucide-react";

import {
  createAttachmentShare,
  listAttachmentShares,
  revokeAttachmentShare,
} from "@/actions/attachments.mutations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LessonioSpinner } from "@/components/shared/lessonio-mark";
import type {
  Attachment,
  AttachmentShare,
  CreatedAttachmentShare,
} from "@/lib/types/attachment";

export interface AttachmentShareDialogProps {
  attachment: Attachment | null;
  onOpenChange: (open: boolean) => void;
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "";
  return new Date(expiresAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AttachmentShareDialog({
  attachment,
  onOpenChange,
}: AttachmentShareDialogProps) {
  return (
    <Dialog open={Boolean(attachment)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Keyed by attachment id so each attachment gets fresh state on mount, rather than
            resetting state imperatively inside an effect. */}
        {attachment && (
          <AttachmentShareDialogBody
            key={attachment.id}
            attachment={attachment}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttachmentShareDialogBody({ attachment }: { attachment: Attachment }) {
  const t = useTranslations("lessons.attachments.share");
  const [shares, setShares] = useState<AttachmentShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<CreatedAttachmentShare | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listAttachmentShares(attachment.id).then((result) => {
      if (result.success) {
        setShares(result.shares);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
  }, [attachment.id]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);

    const result = await createAttachmentShare(attachment.id);
    setCreating(false);

    if (result.success) {
      setCreated(result.share);
      setShares((prev) => [
        {
          id: result.share.id,
          attachmentId: result.share.attachmentId,
          expiresAt: result.share.expiresAt,
          revokedAt: null,
          createdAt: result.share.createdAt,
        },
        ...prev,
      ]);
    } else {
      setError(result.error);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (shareId: string) => {
    setRevokingId(shareId);
    setError(null);

    const result = await revokeAttachmentShare(shareId);
    setRevokingId(null);

    if (result.success) {
      setShares((prev) => prev.filter((share) => share.id !== shareId));
      if (created?.id === shareId) setCreated(null);
    } else {
      setError(result.error);
    }
  };

  const activeShares = shares.filter((share) => !share.revokedAt);
  // The frontend page renders the file (image inline, everything else downloads)
  // instead of the raw JSON the backend's `created.url` (the API endpoint) returns.
  const shareUrl = created && created.url;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="truncate">{t("title")}</DialogTitle>
        <DialogDescription className="truncate">
          {attachment.fileName}
        </DialogDescription>
      </DialogHeader>

      <Button
        type="button"
        variant="outline"
        onClick={() => void handleCreate()}
        disabled={creating}
      >
        {creating && <LessonioSpinner className="size-4" />}
        {t("createLink")}
      </Button>

      {created && (
        <div className="flex flex-col gap-2 rounded-md border bg-muted p-3 min-w-0 max-w-full">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-xs text-foreground whitespace-pre-wrap">
              {shareUrl}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => void handleCopy()}
              aria-label={t("copy")}
            >
              {copied ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("shownOnce")}</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <LessonioSpinner className="size-5" />
          </div>
        ) : activeShares.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noShares")}</p>
        ) : (
          activeShares.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <span className="text-xs text-muted-foreground">
                {share.expiresAt
                  ? t("expiresOn", { date: formatExpiry(share.expiresAt) })
                  : t("noExpiry")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void handleRevoke(share.id)}
                disabled={revokingId === share.id}
                aria-label={t("revoke")}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
