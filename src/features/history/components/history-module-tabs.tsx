"use client";

import { useId, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from "react";

import type { Messages } from "@/features/i18n/messages";

import { useTranslation } from "@/features/i18n/use-translation";
import type { RecordModule } from "@/features/modules/types";
import { cn } from "@/lib/utils";

const ALL = "all";

/** A chip that is not a record module (e.g. 運動), shown between すべて and the modules. */
export type HistoryTab = {
  id: string;
  labelKey: keyof Messages;
  icon: RecordModule["icon"];
  View: ComponentType;
};

type HistoryModuleTabsProps = {
  modules: readonly RecordModule[];
  /** Puts すべて first; `allContent` is shown while it is selected. */
  includeAll: boolean;
  allContent?: ReactNode;
  leadingTabs?: readonly HistoryTab[];
};

/** Chips (すべて + one per module) over the selected chip's content. */
export function HistoryModuleTabs({ modules, includeAll, allContent, leadingTabs = [] }: HistoryModuleTabsProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(ALL);
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel`;

  const views = [
    ...leadingTabs.map((tab) => ({ id: tab.id, labelKey: tab.labelKey, icon: tab.icon, View: tab.View })),
    ...modules.map((m) => ({ id: m.data.id, labelKey: m.labelKey, icon: m.icon, View: m.HistoryView })),
  ];

  // A selection that is gone (module turned OFF) falls back without waiting for an effect.
  const fallback = includeAll ? ALL : (views[0]?.id ?? ALL);
  const active = selected === ALL ? fallback : views.some((view) => view.id === selected) ? selected : fallback;
  const activeView = active === ALL ? undefined : views.find((view) => view.id === active);

  const chips = [
    ...(includeAll ? [{ id: ALL, label: t("history_chip_all"), icon: null as RecordModule["icon"] | null }] : []),
    ...views.map((view) => ({ id: view.id, label: t(view.labelKey), icon: view.icon as RecordModule["icon"] | null })),
  ];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = chips.findIndex((chip) => chip.id === active);
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % chips.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + chips.length) % chips.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = chips.length - 1;
    else return;
    event.preventDefault();
    const id = chips[next].id;
    setSelected(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label={t("history_chips_label")}
        className="flex gap-2 overflow-x-auto pb-1"
        onKeyDown={onKeyDown}
      >
        {chips.map((chip) => {
          const isSelected = chip.id === active;
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              ref={(node) => {
                tabRefs.current[chip.id] = node;
              }}
              id={tabId(chip.id)}
              type="button"
              role="tab"
              aria-controls={panelId}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelected(chip.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "bg-[var(--tonal-bg)] text-[var(--tonal-text)] border border-[var(--tonal-border)]" : "bg-transparent text-foreground border border-border hover:bg-muted",
              )}
            >
              {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
              {chip.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(active)}>{activeView ? <activeView.View key={active} /> : allContent}</div>
    </div>
  );
}
