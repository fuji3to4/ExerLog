"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SegmentedTabsProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange(value: T): void;
  /** Accessible name of the tablist. */
  label: string;
  renderTab(option: T): ReactNode;
  children: ReactNode;
};

/** A row of equal-width tabs over one panel; Left/Right arrows move and select (wrapping). */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
  renderTab,
  children,
}: SegmentedTabsProps<T>) {
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const tabId = (option: T) => `${baseId}-tab-${option}`;
  const panelId = `${baseId}-panel`;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = options[(options.indexOf(value) + step + options.length) % options.length];
    onChange(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label={label} className="flex gap-1" onKeyDown={onKeyDown}>
        {options.map((option) => {
          const isSelected = option === value;
          return (
            <button
              key={option}
              ref={(node) => {
                tabRefs.current[option] = node;
              }}
              id={tabId(option)}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                "h-10 flex-1 rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80",
              )}
              onClick={() => onChange(option)}
            >
              {renderTab(option)}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(value)}>
        {children}
      </div>
    </div>
  );
}
