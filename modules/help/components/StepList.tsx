export interface StepListProps {
  steps: string[];
}

export function StepList({ steps }: StepListProps) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li key={step} className="flex items-start gap-3">
          <span className="bg-primary text-primary-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {index + 1}
          </span>
          <p className="text-sm text-balance">{step}</p>
        </li>
      ))}
    </ol>
  );
}
