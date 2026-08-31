"use client";

import { useState, useTransition } from "react";

import { updateNotificationPolicy } from "@/actions/admin.mutations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import useTranslate from "@/hooks/useTranslate";
import { useRouter } from "@/i18n/navigation";
import type { NotificationPolicyEntry } from "@/lib/types/notification-policy";
import { AdminNav } from "../../components/AdminNav";

interface AdminNotificationSettingsViewProps {
  data: NotificationPolicyEntry[];
}

const CHANNEL_KEYS = ["in_app", "email", "push"] as const;

function groupByGroup(entries: NotificationPolicyEntry[]) {
  const groups = new Map<string, NotificationPolicyEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.group) ?? [];
    bucket.push(entry);
    groups.set(entry.group, bucket);
  }
  return groups;
}

interface RowProps {
  entry: NotificationPolicyEntry;
  onSaved: () => void;
}

const PolicyRow = ({ entry, onSaved }: RowProps) => {
  const t = useTranslate("notifications.admin");
  const tTypes = useTranslate("notifications.types");
  const [enabled, setEnabled] = useState(entry.enabled);
  const [channels, setChannels] = useState<Set<string>>(
    new Set(entry.channels),
  );
  const [offsetMinutes, setOffsetMinutes] = useState<string>(
    entry.offsetMinutes !== null ? String(entry.offsetMinutes) : "",
  );
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const toggleChannel = (channel: string, checked: boolean) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (checked) next.add(channel);
      else next.delete(channel);
      return next;
    });
  };

  const save = () => {
    setStatus("idle");
    startTransition(async () => {
      const minutes = entry.isScheduled ? Number(offsetMinutes) || 1 : null;
      const result = await updateNotificationPolicy(entry.type, {
        enabled,
        channels: Array.from(channels),
        recipientRules: entry.recipientRules,
        timing: entry.isScheduled ? "offset" : "immediate",
        offsetMinutes: minutes,
      });

      if (result.success) {
        onSaved();
      } else {
        setStatus("error");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`policy-enabled-${entry.type}`}
            className="font-medium"
          >
            {tTypes(entry.type)}
          </Label>
          {entry.isScheduled && (
            <Badge variant="outline">{t("scheduledBadge")}</Badge>
          )}
        </div>
        <Switch
          id={`policy-enabled-${entry.type}`}
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {CHANNEL_KEYS.map((channel) => (
          <div key={channel} className="flex items-center gap-2">
            <Checkbox
              id={`policy-${entry.type}-${channel}`}
              checked={channels.has(channel)}
              onCheckedChange={(checked) =>
                toggleChannel(channel, checked === true)
              }
            />
            <Label htmlFor={`policy-${entry.type}-${channel}`}>
              {t(`channels.${channel}`)}
            </Label>
          </div>
        ))}
      </div>

      {entry.isScheduled && (
        <div className="flex items-center gap-2">
          <Label htmlFor={`policy-offset-${entry.type}`} className="text-sm">
            {t("offsetMinutesLabel")}
          </Label>
          <Input
            id={`policy-offset-${entry.type}`}
            type="number"
            min={1}
            className="w-28"
            value={offsetMinutes}
            onChange={(event) => setOffsetMinutes(event.target.value)}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
        {status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            {t("genericError")}
          </p>
        )}
      </div>
    </div>
  );
};

export const AdminNotificationSettingsView = ({
  data,
}: AdminNotificationSettingsViewProps) => {
  const t = useTranslate("notifications.admin");
  const tGroups = useTranslate("notifications.groups");
  const router = useRouter();

  const groups = groupByGroup(data);

  return (
    <div className="flex flex-col gap-6 p-4">
      <AdminNav />

      <div>
        <h1 className="text-foreground text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {data.length === 0 && (
        <p role="alert" className="text-destructive text-sm">
          {t("loadError")}
        </p>
      )}

      {Array.from(groups.entries()).map(([group, entries]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{tGroups(group)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {entries.map((entry) => (
              <PolicyRow
                key={entry.type}
                entry={entry}
                onSaved={() => router.refresh()}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
