"use client";

import { useState, type ReactNode } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { RecordModule } from "@/features/modules/types";
import { cn } from "@/lib/utils";

const ALL = "all";

type HistoryModuleTabsProps = {
  modules: readonly RecordModule[];
  /** Puts すべて first; `allContent` is shown while it is selected. */
  includeAll: boolean;
  allContent?: ReactNode;
};

/** Chips (すべて + one per module) over the selected chip's content. */
export function HistoryModuleTabs({ modules, includeAll, allContent }: HistoryModuleTabsProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(ALL);

  // A selection that is gone (module turned OFF) falls back without waiting for an effect.
  const fallback = includeAll ? ALL : (modules[0]?.data.id ?? ALL);
  const active = selected === ALL ? fallback : modules.some((m) => m.data.id === selected) ? selected : fallback;
  const activeModule = active === ALL ? undefined : modules.find((m) => m.data.id === active);

  const chips = [
    ...(includeAll ? [{ id: ALL, label: t("history_chip_all"), icon: null as RecordModule["icon"] | null }] : []),
    ...modules.map((m) => ({ id: m.data.id, label: t(m.labelKey), icon: m.icon as RecordModule["icon"] | null })),
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={t("history_chips_label")} className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => {
          const isSelected = chip.id === active;
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelected(chip.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
              {chip.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">{activeModule ? <activeModule.HistoryView key={active} /> : allContent}</div>
    </div>
  );
}
