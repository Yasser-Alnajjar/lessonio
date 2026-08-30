"use client";

import { cn } from "@/lib/utils";
import { SELECTABLE_ROLES, type SelectableAppRole } from "@/lib/types/user";

interface RolePickerCardsProps {
  value: SelectableAppRole | undefined;
  onChange: (role: SelectableAppRole) => void;
  labels: Record<SelectableAppRole, { label: string; hint: string }>;
}

/**
 * Two selectable cards, used identically by the register form and the
 * `/onboarding/role` OAuth path — role is chosen exactly once, in exactly
 * this shape, everywhere it's chosen. No `radio-group` primitive exists in
 * `src/components/ui/`, so this is plain buttons rather than a new Radix
 * dependency for a two-option picker.
 */
export function RolePickerCards({
  value,
  onChange,
  labels,
}: RolePickerCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SELECTABLE_ROLES.map((role) => (
        <button
          key={role}
          type="button"
          aria-pressed={value === role}
          onClick={() => onChange(role)}
          className={cn(
            "border-border bg-card hover:bg-accent rounded-xl border p-4 text-start transition-colors",
            value === role && "border-primary bg-primary/5",
          )}
        >
          <span className="text-foreground block text-sm font-medium">
            {labels[role].label}
          </span>
          <span className="text-muted-foreground mt-1 block text-xs">
            {labels[role].hint}
          </span>
        </button>
      ))}
    </div>
  );
}
