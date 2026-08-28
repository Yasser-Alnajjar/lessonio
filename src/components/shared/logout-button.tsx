"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { logout } from "@/actions/auth.mutations";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

type LogoutButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  showLabel?: boolean;
};

export function LogoutButton({
  showLabel = true,
  variant = "ghost",
  ...props
}: LogoutButtonProps) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const result = await logout();
      if (result.success) {
        router.push("/auth/login");
        router.refresh();
      }
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      disabled={isPending}
      onClick={handleLogout}
      {...props}
    >
      <LogOut />
      {showLabel && (isPending ? t("loggingOut") : t("logout"))}
    </Button>
  );
}
