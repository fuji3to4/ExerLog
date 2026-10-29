"use client";

import type { ReactNode } from "react";

import type { ExerciseSet } from "@/lib/types";

type SetSwitcherProps = {
  ariaLabel: string;
  /** Label of the first button; selecting it passes `null`. */
  allLabel: string;
  sets: ExerciseSet[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Shown at the end of the row (for example a set actions menu). */
  trailing?: ReactNode;
};

export function SetSwitcher({ ariaLabel, allLabel, sets, selectedId, onSelect, trailing }: SetSwitcherProps) {
  if (sets.length === 0) return null;

  return (
    <div role="group" aria-label={ariaLabel} className="set-switcher">
      <button
        type="button"
        aria-pressed={selectedId === null}
        className="set-switcher__button"
        onClick={() => onSelect(null)}
      >
        {allLabel}
      </button>
      {sets.map((set) => (
        <button
          key={set.id}
          type="button"
          aria-pressed={selectedId === set.id}
          className="set-switcher__button"
          onClick={() => onSelect(set.id)}
        >
          {set.name}
        </button>
      ))}
      {trailing}
    </div>
  );
}
