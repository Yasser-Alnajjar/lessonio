"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Attachment } from "@/lib/types/attachment";

export interface AttachmentPreviewDialogProps {
  attachment: Attachment | null;
  onOpenChange: (open: boolean) => void;
}

export function AttachmentPreviewDialog({
  attachment,
  onOpenChange,
}: AttachmentPreviewDialogProps) {
  return (
    <Dialog open={Boolean(attachment)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {attachment && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">
                {attachment.fileName}
              </DialogTitle>
            </DialogHeader>

            <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-md bg-muted">
              {attachment.kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.publicUrl}
                  alt={attachment.fileName}
                  className="max-h-[70vh] w-auto object-contain"
                />
              )}
              {attachment.kind === "pdf" && (
                <iframe
                  src={attachment.publicUrl}
                  title={attachment.fileName}
                  className="h-[70vh] w-full"
                />
              )}
              {attachment.kind === "video" && (
                <video
                  src={attachment.publicUrl}
                  controls
                  className="max-h-[70vh] w-full"
                />
              )}
              {attachment.kind === "audio" && (
                <audio
                  src={attachment.publicUrl}
                  controls
                  className="w-full p-6"
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
