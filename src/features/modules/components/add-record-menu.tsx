"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { RecordModule } from "../types";

export type AddRecordMenuProps = {
  /** The modules to offer (the ON ones), in the settings order. */
  modules: readonly RecordModule[];
  onChoose(module: RecordModule): void;
  /** Added to the "＋ 記録する" trigger button. */
  className?: string;
};

const ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-secondary";

/** "＋ 記録する" button that drops down the list of modules to add a record for. */
export function AddRecordMenu({ modules, onChoose, className }: AddRecordMenuProps) {
  const { t } = useTranslation();

  return (
    // Non-modal so the record dialog opened from an item takes over focus and pointer events cleanly.
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button className={className}>{t("timeline_add_record")}</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs text-muted-foreground">
            {t("record_menu_title")}
          </DropdownMenu.Label>
          {modules.length > 0 ? (
            modules.map((module) => {
              const Icon = module.icon;
              return (
                <DropdownMenu.Item key={module.data.id} className={ITEM_CLASS} onSelect={() => onChoose(module)}>
                  <Icon aria-hidden className="h-5 w-5" style={{ color: module.color }} />
                  {t(module.labelKey)}
                </DropdownMenu.Item>
              );
            })
          ) : (
            <>
              <p className="px-3 py-2 text-sm text-muted-foreground">{t("record_menu_none_enabled")}</p>
              <DropdownMenu.Item asChild className={cn(ITEM_CLASS, "text-primary")}>
                <Link href="/settings">{t("record_menu_open_settings")}</Link>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
