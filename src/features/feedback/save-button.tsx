"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";

export type SaveButtonProps = ButtonProps & { isSaved: boolean };

export function SaveButton({ isSaved, className, children, ...props }: SaveButtonProps) {
  const { t } = useTranslation();

  return (
    <Button className={cn(isSaved && "save-button--saved", className)} {...props}>
      {isSaved ? t("feedback_saved") : children}
    </Button>
  );
}
