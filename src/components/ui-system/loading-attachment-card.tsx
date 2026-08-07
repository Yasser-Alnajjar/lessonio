import {
  AlertCircleIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  Music2Icon,
  RefreshCwIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttachmentKind } from "@/lib/types/attachment";

export type AttachmentProcessingStatus = "uploading" | "ready" | "failed";

const KIND_ICONS: Record<AttachmentKind, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  pdf: FileTextIcon,
  video: VideoIcon,
  audio: Music2Icon,
};

export interface LoadingAttachmentCardProps extends React.ComponentProps<"div"> {
  fileName: string;
  kind: AttachmentKind;
  status: AttachmentProcessingStatus;
  /** 0-100, shown only while uploading. */
  progress?: number;
  onRetry?: () => void;
  onRemove?: () => void;
}

export function LoadingAttachmentCard({
  fileName,
  kind,
  status,
  progress,
  onRetry,
  onRemove,
  className,
  ...props
}: LoadingAttachmentCardProps) {
  const KindIcon = KIND_ICONS[kind];

  return (
    <Card
      data-slot="loading-attachment-card"
      data-status={status}
      className={cn(
        "flex flex-row items-center gap-3 p-3",
        status === "failed" && "border-destructive/40",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground",
          status === "failed" && "bg-destructive/10 text-destructive",
        )}
      >
        {status === "uploading" ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : status === "failed" ? (
          <AlertCircleIcon className="size-4" />
        ) : (
          <KindIcon className="size-4" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium text-foreground">{fileName}</span>
        {status === "uploading" && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5" />
            {typeof progress === "number" && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        )}
        {status === "failed" && (
          <span className="text-xs text-destructive">Upload failed</span>
        )}
        {status === "ready" && (
          <span className="text-xs text-muted-foreground">Ready</span>
        )}
      </div>

      {status === "failed" && onRetry && (
        <Button variant="ghost" size="icon-sm" onClick={onRetry} aria-label="Retry upload">
          <RefreshCwIcon className="size-4" />
        </Button>
      )}
      {onRemove && status !== "uploading" && (
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove attachment">
          <XIcon className="size-4" />
        </Button>
      )}
    </Card>
  );
}
