import { ArrowDown } from "lucide-react";

export interface HelpFlowDiagramProps {
  steps: string[];
}

/**
 * A deliberately simple at-a-glance flow — plain cards and arrows, not a
 * technical diagram. Reused wherever the app needs to show "this leads to
 * that" (the Help Center home, and the "how it works" topic).
 */
export function HelpFlowDiagram({ steps }: HelpFlowDiagramProps) {
  return (
    <ol className="flex flex-col items-stretch gap-1">
      {steps.map((step, index) => (
        <li key={step} className="flex flex-col items-center gap-1">
          <div className="border-border bg-card w-full rounded-xl border px-4 py-3 text-center text-sm font-medium">
            {step}
          </div>
          {index < steps.length - 1 && (
            <ArrowDown className="text-muted-foreground/50 size-4 shrink-0" />
          )}
        </li>
      ))}
    </ol>
  );
}
