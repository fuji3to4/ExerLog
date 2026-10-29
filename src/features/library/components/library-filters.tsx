"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import { formatDuration } from "@/lib/date/duration";

export type LibraryFiltersValue = {
  search: string;
  set: string;
  bodyArea: string;
  purpose: string;
  duration: string;
  intensity: string;
  sort: string;
};

type LibraryFiltersProps = {
  value: LibraryFiltersValue;
  onChange: (nextValue: LibraryFiltersValue) => void;
};

type SelectOption = {
  label: string;
  value: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (nextValue: string) => void;
};

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="library-filters__field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const DURATION_STEP_SECONDS = 30;

// "m:ss" or a plain number of minutes ("2", "1.5"). Empty means no limit (null);
// anything unparseable is undefined so the filter keeps its last value while typing.
function parseDurationInput(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const clock = /^(\d+):([0-5]?\d)$/.exec(trimmed);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);

  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 60);

  return undefined;
}

type DurationFilterInputProps = {
  label: string;
  placeholder: string;
  increaseLabel: string;
  decreaseLabel: string;
  value: string;
  onChange: (nextValue: string) => void;
};

// Free-typed maximum duration. The arrow keys and the step buttons move it in 30-second steps;
// stepping down below 0:30 clears the limit.
function DurationFilterInput({ label, placeholder, increaseLabel, decreaseLabel, value, onChange }: DurationFilterInputProps) {
  const [draft, setDraft] = useState(value ? formatDuration(Number(value)) : "");

  function commit(seconds: number | null) {
    onChange(seconds === null ? "" : String(seconds));
    setDraft(seconds === null ? "" : formatDuration(seconds));
  }

  function step(direction: 1 | -1) {
    const current = value ? Number(value) : null;
    if (direction === 1) {
      commit(current === null ? DURATION_STEP_SECONDS : Math.floor(current / DURATION_STEP_SECONDS + 1) * DURATION_STEP_SECONDS);
      return;
    }

    if (current === null) return;
    const next = Math.ceil(current / DURATION_STEP_SECONDS - 1) * DURATION_STEP_SECONDS;
    commit(next < DURATION_STEP_SECONDS ? null : next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    step(event.key === "ArrowUp" ? 1 : -1);
  }

  return (
    <div className="library-filters__field">
      <label htmlFor="duration-filter">{label}</label>
      <div className="library-filters__stepper">
        <input
          id="duration-filter"
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = parseDurationInput(event.target.value);
            if (parsed !== undefined) onChange(parsed === null ? "" : String(parsed));
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setDraft(value ? formatDuration(Number(value)) : "")}
        />
        <button type="button" aria-label={decreaseLabel} onClick={() => step(-1)}>
          <ChevronDown className="size-5" aria-hidden />
        </button>
        <button type="button" aria-label={increaseLabel} onClick={() => step(1)}>
          <ChevronUp className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function LibraryFilters({ value, onChange }: LibraryFiltersProps) {
  const { t } = useTranslation();

  const bodyAreaOptions: SelectOption[] = [
    { label: t("body_area_all"), value: "" },
    { label: t("body_area_upper_body"), value: "upper-body" },
    { label: t("body_area_lower_body"), value: "lower-body" },
    { label: t("body_area_full_body"), value: "full-body" },
  ];

  const purposeOptions: SelectOption[] = [
    { label: t("purpose_all"), value: "" },
    { label: t("purpose_warmup"), value: "warmup" },
    { label: t("purpose_mobility"), value: "mobility" },
    { label: t("purpose_strength"), value: "strength" },
    { label: t("purpose_recovery"), value: "recovery" },
    { label: t("purpose_endurance"), value: "endurance" },
  ];

  const intensityOptions: SelectOption[] = [
    { label: t("intensity_any"), value: "" },
    { label: t("intensity_low"), value: "low" },
    { label: t("intensity_medium"), value: "medium" },
    { label: t("intensity_high"), value: "high" },
  ];

  return (
    <div className="library-filters">
      <div className="library-filters__grid">
        <FilterSelect
          label={t("meta_body_area")}
          value={value.bodyArea}
          options={bodyAreaOptions}
          onChange={(nextValue) => onChange({ ...value, bodyArea: nextValue })}
        />
        <FilterSelect
          label={t("meta_purpose")}
          value={value.purpose}
          options={purposeOptions}
          onChange={(nextValue) => onChange({ ...value, purpose: nextValue })}
        />
        <DurationFilterInput
          label={t("meta_duration")}
          placeholder={t("duration_any")}
          increaseLabel={t("library_duration_increase")}
          decreaseLabel={t("library_duration_decrease")}
          value={value.duration}
          onChange={(nextValue) => onChange({ ...value, duration: nextValue })}
        />
        <FilterSelect
          label={t("meta_intensity")}
          value={value.intensity}
          options={intensityOptions}
          onChange={(nextValue) => onChange({ ...value, intensity: nextValue })}
        />
      </div>
    </div>
  );
}
