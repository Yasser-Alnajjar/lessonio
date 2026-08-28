import { LessonioMark } from "@/components/shared/lessonio-mark";
import { getTranslations } from "next-intl/server";
import { Link } from "@navigation";
import { LanguageSwitch } from "@/components/shared/language-switch";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Code } from "lucide-react";
import { Actions } from "@/actions";

const DocsLayout = async ({ children }: { children: React.ReactNode }) => {
  const t = await getTranslations("docs");
  const tApp = await getTranslations("app");
  const { data: user } = await Actions.Auth.getSession();
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <header className="border-border/60 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-6">
          <Link href="/" className="flex items-center gap-2">
            <LessonioMark className="h-6 w-auto" />
            <span className="text-md">Lessonio</span>
          </Link>

          <nav className="ms-auto flex items-center gap-2" aria-label="Primary">
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild size="sm" variant="ghost">
                <Link href="/docs/api">
                  <Code className="h-4" />
                  <span className="text-md">For Developers</span>
                </Link>
              </Button>

              <ThemeToggle />
              <LanguageSwitch />
            </div>
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard/overview">
                  {t("cta.go_to_dashboard")}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">{t("cta.secondary")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/register">{t("cta.primary")}</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      {/* Footer */}
      <footer className="border-border/60 mt-auto border-t">
        <div className="text-muted-foreground/70 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-xs sm:flex-row">
          <div className="flex items-center gap-2">
            <LessonioMark className="h-4 w-auto" />
            <Link href="/" className="hover:text-foreground transition-colors">
              {t("backHome")}
            </Link>
          </div>
          <span>
            © {new Date().getFullYear()} {tApp("name")}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default DocsLayout;
