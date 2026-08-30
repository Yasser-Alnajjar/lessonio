import { Badge } from "@/components/ui/badge";

export interface StatusExplainerValue {
  value: string;
  label: string;
  meaning: string;
  whenToUse: string;
  effect: string;
  reversible: string;
}

export interface StatusExplainerCardProps {
  groupLabel: string;
  values: StatusExplainerValue[];
}

export function StatusExplainerCard({
  groupLabel,
  values,
}: StatusExplainerCardProps) {
  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
      <h3 className="text-sm font-semibold">{groupLabel}</h3>
      <div className="flex flex-col divide-y divide-border">
        {values.map((status) => (
          <div
            key={status.value}
            className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0"
          >
            <Badge variant="outline" className="w-fit">
              {status.label}
            </Badge>
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground shrink-0 font-medium">
                  {status.meaning}
                </dt>
              </div>
              <div className="text-muted-foreground flex flex-col gap-1 text-xs">
                <p>{status.whenToUse}</p>
                <p>{status.effect}</p>
                <p>{status.reversible}</p>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
