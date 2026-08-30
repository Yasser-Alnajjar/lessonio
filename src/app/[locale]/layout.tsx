import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { Open_Sans, Cairo } from "next/font/google";

import "@fontsource-variable/fraunces/full.css";

import { routing, localeDirections, type AppLocale } from "@/i18n/routing";
import { localeOpenGraph, siteUrl } from "@/lib/seo";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { SKINS, type Skin } from "@/lib/types/settings";
import "../globals.css";
import { cn } from "@/lib/utils";

function readSkinCookie(value: string | undefined): Skin {
  return (SKINS as readonly string[]).includes(value ?? "")
    ? (value as Skin)
    : "default";
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}
const cairo = Cairo({
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-cairo",
});
const openSans = Open_Sans({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-open-sans",
});
export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "app" });

  return {
    metadataBase: siteUrl,
    title: {
      default: "Lessonio",
      template: `%s · Lessonio`,
    },
    description: t("tagline"),
    applicationName: "Lessonio",
    creator: "Yasser Alnajjar",
    publisher: "Yasser Alnajjar",
    icons: {
      icon: "/favicon.ico",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    openGraph: {
      type: "website",
      siteName: "Lessonio",
      title: "Lessonio",
      description: t("tagline"),
      ...localeOpenGraph(locale),
    },
    twitter: {
      card: "summary",
      title: "Lessonio",
      description: t("tagline"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(error);
  }
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  if (!messages) notFound();

  const direction = localeDirections[locale as AppLocale];
  const cookieStore = await cookies();
  const skin = readSkinCookie(cookieStore.get("skin")?.value);

  return (
    <html
      lang={locale}
      dir={direction}
      data-skin={skin}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body
        className={cn(
          `  bg-background text-foreground font-cairo  antialiased`,
          locale === "ar" ? cairo.className : openSans.className,
        )}
      >
        <NextIntlClientProvider>
          <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <OfflineBanner />
              {children}
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
