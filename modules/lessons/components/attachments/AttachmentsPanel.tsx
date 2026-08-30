"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, Share2Icon, Trash2Icon, UploadIcon } from "lucide-react";

import {
  deleteAttachment,
  uploadAttachment,
} from "@/actions/attachments.mutations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui-system/confirm-dialog";
import { EmptyState } from "@/components/ui-system/empty-state";
import {
  LoadingAttachmentCard,
  type AttachmentProcessingStatus,
} from "@/components/ui-system/loading-attachment-card";
import {
  ACCEPTED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  attachmentKindForMimeType,
} from "@/lib/constants/attachments";
import type { Attachment, AttachmentKind } from "@/lib/types/attachment";
import { AttachmentPreviewDialog } from "./AttachmentPreviewDialog";
import { AttachmentShareDialog } from "./AttachmentShareDialog";

export interface AttachmentsPanelProps {
  lessonId: string;
  attachments: Attachment[];
}

interface PendingUpload {
  key: string;
  file: File;
  fileName: string;
  kind: AttachmentKind;
  status: AttachmentProcessingStatus;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  lessonId,
  attachments: initialAttachments,
}: AttachmentsPanelProps) {
  const t = useTranslations("lessons.attachments");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [previewTarget, setPreviewTarget] = useState<Attachment | null>(null);
  const [shareTarget, setShareTarget] = useState<Attachment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  const runUpload = async (pendingUpload: PendingUpload) => {
    setPending((prev) =>
      prev.map((item) =>
        item.key === pendingUpload.key
          ? { ...item, status: "uploading" }
          : item,
      ),
    );

    const result = await uploadAttachment(lessonId, pendingUpload.file);

    if (result.success) {
      setAttachments((prev) => [result.attachment, ...prev]);
      setPending((prev) =>
        prev.filter((item) => item.key !== pendingUpload.key),
      );
    } else {
      setPending((prev) =>
        prev.map((item) =>
          item.key === pendingUpload.key
            ? { ...item, status: "failed", error: result.error }
            : item,
        ),
      );
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const kind = attachmentKindForMimeType(file.type);
      const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;

      if (!kind) {
        setPending((prev) => [
          ...prev,
          {
            key,
            file,
            fileName: file.name,
            kind: "pdf",
            status: "failed",
            error: t("unsupportedType"),
          },
        ]);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setPending((prev) => [
          ...prev,
          {
            key,
            file,
            fileName: file.name,
            kind,
            status: "failed",
            error: t("tooLarge"),
          },
        ]);
        continue;
      }

      const pendingUpload: PendingUpload = {
        key,
        file,
        fileName: file.name,
        kind,
        status: "uploading",
      };
      setPending((prev) => [...prev, pendingUpload]);
      void runUpload(pendingUpload);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteAttachment(deleteTarget.id);
    if (result.success) {
      setAttachments((prev) =>
        prev.filter((item) => item.id !== deleteTarget.id),
      );
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon />
          {t("upload")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            handleFilesSelected(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          {pending.map((item) => (
            <LoadingAttachmentCard
              key={item.key}
              fileName={item.fileName}
              kind={item.kind}
              status={item.status}
              onRetry={
                item.status === "failed"
                  ? () => void runUpload(item)
                  : undefined
              }
              onRemove={() =>
                setPending((prev) => prev.filter((p) => p.key !== item.key))
              }
            />
          ))}
        </div>
      )}

      {attachments.length === 0 && pending.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attachments.map((attachment) => (
            <Card key={attachment.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {attachment.fileName}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(attachment.sizeBytes)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setPreviewTarget(attachment)}
                  aria-label={t("preview")}
                >
                  <EyeIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShareTarget(attachment)}
                  aria-label={t("share.trigger")}
                >
                  <Share2Icon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(attachment)}
                  aria-label={t("delete")}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AttachmentPreviewDialog
        attachment={previewTarget}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
      />

      <AttachmentShareDialog
        attachment={shareTarget}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("deleteTitle")}
        description={t("deleteDescription", {
          name: deleteTarget?.fileName ?? "",
        })}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("deleteCancel")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
