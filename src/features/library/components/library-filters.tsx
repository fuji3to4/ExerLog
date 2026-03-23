"use client";

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

const bodyAreaOptions: SelectOption[] = [
  { label: "All body areas", value: "" },
  { label: "Upper body", value: "upper-body" },
  { label: "Lower body", value: "lower-body" },
  { label: "Full body", value: "full-body" },
];

const purposeOptions: SelectOption[] = [
  { label: "All purposes", value: "" },
  { label: "Warmup", value: "warmup" },
  { label: "Mobility", value: "mobility" },
  { label: "Strength", value: "strength" },
  { label: "Recovery", value: "recovery" },
  { label: "Endurance", value: "endurance" },
];

const durationOptions: SelectOption[] = [
  { label: "Any duration", value: "" },
  { label: "3 min", value: "3" },
  { label: "4 min", value: "4" },
  { label: "5 min", value: "5" },
  { label: "6 min", value: "6" },
  { label: "10 min", value: "10" },
];

const intensityOptions: SelectOption[] = [
  { label: "Any intensity", value: "" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

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
  return (
    <section className="card library-filters">
      <div className="library-filters__heading">
        <h2>Find an exercise</h2>
        <p>Use a simple search or narrow the list with one or two filters.</p>
      </div>

      <label className="library-filters__field" htmlFor="search-exercises">
        <span>Search exercises</span>
        <input
          id="search-exercises"
          type="search"
          value={value.search}
          placeholder="Search by title or description"
          onChange={(event) => onChange({ ...value, search: event.target.value })}
        />
      </label>

      <div className="library-filters__grid">
        <FilterSelect
          label="Body area"
          value={value.bodyArea}
          options={bodyAreaOptions}
          onChange={(nextValue) => onChange({ ...value, bodyArea: nextValue })}
        />
        <FilterSelect
          label="Purpose"
          value={value.purpose}
          options={purposeOptions}
          onChange={(nextValue) => onChange({ ...value, purpose: nextValue })}
        />
        <FilterSelect
          label="Duration"
          value={value.duration}
          options={durationOptions}
          onChange={(nextValue) => onChange({ ...value, duration: nextValue })}
        />
        <FilterSelect
          label="Intensity"
          value={value.intensity}
          options={intensityOptions}
          onChange={(nextValue) => onChange({ ...value, intensity: nextValue })}
        />
      </div>
    </section>
  );
}
