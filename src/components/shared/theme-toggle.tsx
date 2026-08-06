"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun },
  { value: "system", icon: Laptop },
  { value: "dark", icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  // Theme is undefined until mounted client-side; avoid rendering a value
  // that could mismatch the server-rendered markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // next-themes hydration guard: theme is unknown until mounted
    // client-side, so this one-time flag is required, not incidental state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const active = mounted ? (theme ?? "system") : "system";

  return (
    <div
      role="radiogroup"
      aria-label={t("toggleLabel")}
      className="bg-muted relative inline-flex items-center gap-0.5 rounded-full p-1"
    >
      {OPTIONS.map(({ value, icon: Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={t(value)}
            onClick={() => setTheme(value)}
            className={cn(
              "relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="theme-toggle-active"
                className="bg-primary absolute inset-0 -z-10 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="h-4 w-4" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
