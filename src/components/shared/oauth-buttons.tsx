"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { signInWithOAuth } from "@/actions/auth.mutations";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/shared/oauth-icons";
import type { OAuthProvider } from "@/lib/types/auth";

interface OAuthButtonsProps {
  /** Path to return to after a successful sign-in, e.g. the `?next=` param. */
  next?: string;
}

/**
 * Shared by the login and register forms — Supabase's OAuth flow creates the
 * `auth.users`/`profiles` row on first sign-in, so the same action covers
 * both. On success `signInWithOAuth` redirects to the provider and never
 * returns; only the error path resolves here.
 */
export function OAuthButtons({ next }: OAuthButtonsProps) {
  const t = useTranslations("auth.oauth");
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = (provider: OAuthProvider) => {
    setError(null);
    setPendingProvider(provider);
    startTransition(async () => {
      const result = await signInWithOAuth(provider, next);
      if (!result.success) {
        setError(result.error);
        setPendingProvider(null);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {t("orContinueWith")}
        </span>
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => handleClick("google")}
      >
        {isPending && pendingProvider === "google" ? (
          <Loader2 className="animate-spin" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        {t("google")}
      </Button>

      {error && (
        <p role="alert" className="text-destructive text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
