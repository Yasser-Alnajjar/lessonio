import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";

interface HomePageProps {
  params: Promise<{ locale: AppLocale }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("app");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t("name")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
      <p className="text-muted-foreground mt-4 text-sm">
        Phase 1 scaffold — dashboard lands in Phase 7.
      </p>
    </main>
  );
}
