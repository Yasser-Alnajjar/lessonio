"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { updateSkin } from "@/actions/settings.mutations";
import { cn } from "@/lib/utils";
import { SKINS, type Skin } from "@/lib/types/settings";

interface SkinPickerProps {
  initialSkin: Skin;
}

export const SkinPicker = ({ initialSkin }: SkinPickerProps) => {
  const t = useTranslations("settings.appearance.skins");
  const [active, setActive] = useState<Skin>(initialSkin);
  const [isPending, startTransition] = useTransition();

  const select = (skin: Skin) => {
    if (skin === active) return;

    setActive(skin);
    document.documentElement.setAttribute("data-skin", skin);

    startTransition(async () => {
      const result = await updateSkin(skin);
      if (!result.success) {
        // Roll back on failure — the DOM already reflects the old skin's
        // variables the moment the attribute flips back.
        setActive(initialSkin);
        document.documentElement.setAttribute("data-skin", initialSkin);
      }
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("pickerLabel")}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {SKINS.map((skin) => {
        const isActive = active === skin;
        return (
          <button
            key={skin}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isPending}
            onClick={() => select(skin)}
            className={cn(
              "group flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isActive
                ? "border-primary"
                : "border-border hover:border-primary/50",
              isPending && "opacity-70",
            )}
          >
            <span
              data-skin={skin}
              className="bg-background border-border relative flex h-10 w-full items-center justify-center gap-1 overflow-hidden rounded-md border"
            >
              <span className="bg-primary h-4 w-4 rounded-full" />
              <span className="bg-accent h-4 w-4 rounded-full" />
              <span className="bg-secondary h-4 w-4 rounded-full" />
              {isActive && (
                <span className="bg-primary text-primary-foreground absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="text-foreground text-xs font-medium">
              {t(skin)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
