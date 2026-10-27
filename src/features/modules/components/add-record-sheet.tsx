"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "@/features/i18n/use-translation";
import type { RecordModule } from "../types";

export type AddRecordSheetProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** The modules to offer (the ON ones), in the settings order. */
  modules: readonly RecordModule[];
  onChoose(module: RecordModule): void;
};

/** Bottom sheet that asks which kind of record to add, as a four-column grid of tiles. */
export function AddRecordSheet({ open, onOpenChange, modules, onChoose }: AddRecordSheetProps) {
  const { t } = useTranslation();

  function choose(module: RecordModule) {
    onOpenChange(false);
    onChoose(module);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" aria-describedby={undefined} className="rounded-t-2xl px-4 pb-6 pt-5">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">{t("record_sheet_title")}</SheetTitle>
        </SheetHeader>
        {modules.length > 0 ? (
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <li key={module.data.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-center gap-1 rounded-xl bg-secondary px-1 py-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => choose(module)}
                  >
                    <Icon aria-hidden className="h-6 w-6" style={{ color: module.color }} />
                    {t(module.labelKey)}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">{t("record_sheet_none_enabled")}</p>
            <Link
              href="/settings"
              className={buttonVariants({ variant: "secondary" })}
              onClick={() => onOpenChange(false)}
            >
              {t("record_sheet_open_settings")}
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
