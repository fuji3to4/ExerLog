"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";

type LibraryFiltersValue = {
  search: string;
  bodyArea: string;
  purpose: string;
  duration: string;
  intensity: string;
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

  const durationOptions: SelectOption[] = [
    { label: t("duration_any"), value: "" },
    { label: t("duration_minutes", { count: 3 }), value: "3" },
    { label: t("duration_minutes", { count: 4 }), value: "4" },
    { label: t("duration_minutes", { count: 5 }), value: "5" },
    { label: t("duration_minutes", { count: 6 }), value: "6" },
    { label: t("duration_minutes", { count: 10 }), value: "10" },
  ];

  const intensityOptions: SelectOption[] = [
    { label: t("intensity_any"), value: "" },
    { label: t("intensity_low"), value: "low" },
    { label: t("intensity_medium"), value: "medium" },
    { label: t("intensity_high"), value: "high" },
  ];

  return (
    <Card className="library-filters">
      <CardHeader>
        <CardTitle>{t("library_filters_heading")}</CardTitle>
        <p>{t("library_filters_subheading")}</p>
      </CardHeader>

      <CardContent>
        <label className="library-filters__field" htmlFor="search-exercises">
          <span>{t("library_search_label")}</span>
          <input
            id="search-exercises"
            type="search"
            value={value.search}
            placeholder={t("library_search_placeholder")}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
          />
        </label>

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
          <FilterSelect
            label={t("meta_duration")}
            value={value.duration}
            options={durationOptions}
            onChange={(nextValue) => onChange({ ...value, duration: nextValue })}
          />
          <FilterSelect
            label={t("meta_intensity")}
            value={value.intensity}
            options={intensityOptions}
            onChange={(nextValue) => onChange({ ...value, intensity: nextValue })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
