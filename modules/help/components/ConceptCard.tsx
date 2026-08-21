export interface ConceptCardProps {
  title: string;
  description: string;
}

export function ConceptCard({ title, description }: ConceptCardProps) {
  return (
    <div className="border-border bg-card flex flex-col gap-1.5 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm text-balance">{description}</p>
    </div>
  );
}
