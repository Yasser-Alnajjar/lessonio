import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { StudyLineMark } from "@/components/shared/study-line-mark";

const SWATCHES = [
  { className: "bg-background", label: "Background" },
  { className: "bg-card", label: "Card" },
  { className: "bg-primary", label: "Primary — Ink" },
  { className: "bg-secondary", label: "Secondary" },
  { className: "bg-muted", label: "Muted" },
  { className: "bg-accent", label: "Accent" },
  { className: "bg-success", label: "Success — Sage" },
  { className: "bg-highlighter", label: "Highlighter" },
  { className: "bg-destructive", label: "Destructive — Margin" },
] as const;

export default async function HomePage() {
  const t = await getTranslations("app");
  const tp = await getTranslations("themePreview");

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-16 px-6 py-16 sm:py-24">
      {/* Hero */}
      <section className="flex flex-col items-start gap-6">
        <div className="flex w-full items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {t("name")}
          </span>
          <ThemeToggle />
        </div>

        <StudyLineMark className="h-16 w-auto" />

        <h1 className="font-display max-w-2xl text-4xl leading-[1.1] font-medium text-balance sm:text-5xl">
          {tp("heading")}
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-balance">
          {tp("subheading")}
        </p>
      </section>

      {/* Palette */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl">{tp("colorsHeading")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SWATCHES.map(({ className, label }) => (
            <div
              key={label}
              className="border-border overflow-hidden rounded-xl border"
            >
              <div className={`h-16 ${className}`} />
              <p className="text-foreground bg-card px-3 py-2 text-xs font-medium">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl">{tp("typographyHeading")}</h2>
        <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-6">
          <p className="font-display text-3xl">Fraunces — Aa Study Line</p>
          <p className="font-sans text-lg">
            Geist Sans — Every lesson, tracked and reviewed.
          </p>
          <p className="text-muted-foreground font-mono text-sm">
            Geist Mono — 04:32:00 · 87% attendance · Level 12
          </p>
          <p className="text-muted-foreground text-sm">
            {tp("typographyBody")}
          </p>
        </div>
      </section>

      {/* Glassmorphism */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl">{tp("glassHeading")}</h2>
        <div className="from-primary/30 via-highlighter/20 to-success/30 relative overflow-hidden rounded-2xl bg-linear-to-br p-8">
          <div className="glass-panel rounded-xl p-5">
            <p className="text-foreground text-sm font-medium">.glass-panel</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {tp("glassBody")}
            </p>
          </div>
        </div>
      </section>

      <p className="text-muted-foreground/70 text-center text-xs">
        {tp("note")}
      </p>
    </main>
  );
}
