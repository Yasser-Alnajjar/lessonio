/**
 * Temporary placeholder for Phase 2 (Folder Structure).
 *
 * Every feature module renders this today so the app is fully navigable and
 * every route builds end-to-end. Each one is replaced by its real UI in its
 * dedicated phase (Subject CRUD, Lesson CRUD, Calendar, Statistics, etc.) —
 * the surrounding SSR/CSR/Actions plumbing does not change when that happens.
 */
interface FeaturePlaceholderProps {
  title: string;
  description: string;
  itemCount?: number;
}

export function FeaturePlaceholder({
  title,
  description,
  itemCount,
}: FeaturePlaceholderProps) {
  return (
    <div className="border-muted-foreground/20 flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-10 text-center">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      {typeof itemCount === "number" && (
        <p className="text-muted-foreground/70 mt-2 text-xs">
          {itemCount} record{itemCount === 1 ? "" : "s"} loaded from Actions
        </p>
      )}
    </div>
  );
}
