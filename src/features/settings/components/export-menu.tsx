"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";

export type ExportMenuItem = { key: string; label: string; onSelect(): void };

const ITEM_CLASS =
  "flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-secondary";

/** One settings button that drops down the list of CSV exports (same pattern as the "＋ 記録する" menu). */
export function ExportMenu({ label, items }: { label: string; items: readonly ExportMenuItem[] }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="settings-action-button inline-flex items-center gap-1">
          {label}
          <ChevronDown aria-hidden className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {items.map((item) => (
            <DropdownMenu.Item key={item.key} className={ITEM_CLASS} onSelect={item.onSelect}>
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
