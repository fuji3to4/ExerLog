# Circumference Measurements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 new body circumference measurements (right arm, left arm, right leg, left leg, abdomen) to ExerLog with proper UI organization, validation, and history graph support.

**Architecture:** Extend the existing flexible `dailyMetrics` system by adding new `MetricType` values. Use grouped UI sections for better organization. Add validation with min/max ranges. Update history graphs with grouped dropdown using `<optgroup>`.

**Tech Stack:** TypeScript, React, Next.js, Dexie.js (IndexedDB), Recharts, Tailwind CSS

---

## File Structure

### Files to Modify

1. **`src/lib/types.ts`** - Add new `MetricType` values
2. **`src/features/i18n/messages/en.ts`** - Add English translations
3. **`src/features/i18n/messages/ja.ts`** - Add Japanese translations
4. **`src/features/self-care/components/metrics-card.tsx`** - Add grouped sections and new fields
5. **`src/features/history/history-graph-query.ts`** - Add labels and units for new types
6. **`src/features/history/components/history-graphs.tsx`** - Add grouped dropdown options

### Files to Create

- **`docs/superpowers/plans/2026-06-08-circumference-measurements.md`** (this plan)

---

## Implementation Tasks

### Task 1: Update Type Definitions

**Files:**
- Modify: `src/lib/types.ts:9`

- [ ] **Step 1: Update MetricType union type**

```typescript
// src/lib/types.ts (line 9)
export type MetricType = 
  | "height" 
  | "weight" 
  | "bodyFat"
  | "rightArm"
  | "leftArm"
  | "rightLeg"
  | "leftLeg"
  | "abdomen";
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run type-check` or `npx tsc --noEmit`
Expected: No errors (new types are not yet used, so no breaking changes)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add circumference measurement types to MetricType

- Add rightArm, leftArm, rightLeg, leftLeg, abdomen types
- Extends existing flexible MetricType system"
```

---

### Task 2: Add i18n Translations (English)

**Files:**
- Modify: `src/features/i18n/messages/en.ts`

- [ ] **Step 1: Add English translation keys**

```typescript
// src/features/i18n/messages/en.ts
// Add to the exported object:

export const en = {
  // ... existing translations ...
  
  // Metric labels
  "self_care_metric_right_arm": "Right arm",
  "self_care_metric_left_arm": "Left arm",
  "self_care_metric_right_leg": "Right leg",
  "self_care_metric_left_leg": "Left leg",
  "self_care_metric_abdomen": "Abdomen",
  
  // Group headings
  "self_care_metrics_basic_group": "Basic Metrics",
  "self_care_metrics_circumference_group": "Circumference Measurements",
  
  // Validation error
  "metrics_validation_error": "{{label}} must be between {{min}} and {{max}} {{unit}}",
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/i18n/messages/en.ts
git commit -m "feat(i18n): add English translations for circumference measurements"
```

---

### Task 3: Add i18n Translations (Japanese)

**Files:**
- Modify: `src/features/i18n/messages/ja.ts`

- [ ] **Step 1: Add Japanese translation keys**

```typescript
// src/features/i18n/messages/ja.ts
// Add to the exported object:

export const ja = {
  // ... existing translations ...
  
  // Metric labels
  "self_care_metric_right_arm": "右腕",
  "self_care_metric_left_arm": "左腕",
  "self_care_metric_right_leg": "右脚",
  "self_care_metric_left_leg": "左脚",
  "self_care_metric_abdomen": "腹囲",
  
  // Group headings
  "self_care_metrics_basic_group": "基本測定",
  "self_care_metrics_circumference_group": "周径測定",
  
  // Validation error
  "metrics_validation_error": "{{label}}は{{min}}〜{{max}}{{unit}}の範囲で入力してください",
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/i18n/messages/ja.ts
git commit -m "feat(i18n): add Japanese translations for circumference measurements"
```

---

### Task 4: Update Metrics Card UI - Add Grouped Sections

**Files:**
- Modify: `src/features/self-care/components/metrics-card.tsx`

- [ ] **Step 1: Write failing test for grouped metrics rendering**

```typescript
// src/features/self-care/components/metrics-card.test.tsx
import { render, screen } from "@testing-library/react";
import { MetricsCard } from "./metrics-card";

describe("MetricsCard", () => {
  const mockProps = {
    metrics: {
      height: "",
      weight: "",
      bodyFat: "",
      rightArm: "",
      leftArm: "",
      rightLeg: "",
      leftLeg: "",
      abdomen: "",
    },
    onMetricChange: jest.fn(),
  };

  it("renders basic metrics group heading", () => {
    render(<MetricsCard {...mockProps} />);
    
    expect(screen.getByText("Basic Metrics")).toBeInTheDocument();
  });

  it("renders circumference measurements group heading", () => {
    render(<MetricsCard {...mockProps} />);
    
    expect(screen.getByText("Circumference Measurements")).toBeInTheDocument();
  });

  it("renders all 8 metric input fields", () => {
    render(<MetricsCard {...mockProps} />);
    
    expect(screen.getByLabelText("Height")).toBeInTheDocument();
    expect(screen.getByLabelText("Weight")).toBeInTheDocument();
    expect(screen.getByLabelText("Body fat")).toBeInTheDocument();
    expect(screen.getByLabelText("Right arm")).toBeInTheDocument();
    expect(screen.getByLabelText("Left arm")).toBeInTheDocument();
    expect(screen.getByLabelText("Right leg")).toBeInTheDocument();
    expect(screen.getByLabelText("Left leg")).toBeInTheDocument();
    expect(screen.getByLabelText("Abdomen")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- metrics-card.test.tsx`
Expected: FAIL (component doesn't render new fields yet)

- [ ] **Step 3: Refactor MetricsCard component**

```typescript
// src/features/self-care/components/metrics-card.tsx
import type { ChangeEvent } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/features/i18n/use-translation";
import type { MetricType } from "@/lib/types";

type MetricsCardProps = {
  metrics: Record<MetricType, string>;
  onMetricChange: (metricType: MetricType, value: string) => void;
};

type MetricField = {
  metricType: MetricType;
  unit: string;
  labelKey: "self_care_metric_height" | "self_care_metric_weight" | "self_care_metric_body_fat" | 
             "self_care_metric_right_arm" | "self_care_metric_left_arm" | 
             "self_care_metric_right_leg" | "self_care_metric_left_leg" | 
             "self_care_metric_abdomen";
  min?: number;
  max?: number;
  group: "basic" | "circumference";
};

const METRIC_FIELDS: MetricField[] = [
  // Basic Metrics Group
  { metricType: "height", unit: "cm", labelKey: "self_care_metric_height", min: 50, max: 300, group: "basic" },
  { metricType: "weight", unit: "kg", labelKey: "self_care_metric_weight", min: 20, max: 500, group: "basic" },
  { metricType: "bodyFat", unit: "%", labelKey: "self_care_metric_body_fat", min: 1, max: 100, group: "basic" },
  
  // Circumference Measurements Group
  { metricType: "rightArm", unit: "cm", labelKey: "self_care_metric_right_arm", min: 15, max: 60, group: "circumference" },
  { metricType: "leftArm", unit: "cm", labelKey: "self_care_metric_left_arm", min: 15, max: 60, group: "circumference" },
  { metricType: "rightLeg", unit: "cm", labelKey: "self_care_metric_right_leg", min: 30, max: 100, group: "circumference" },
  { metricType: "leftLeg", unit: "cm", labelKey: "self_care_metric_left_leg", min: 30, max: 100, group: "circumference" },
  { metricType: "abdomen", unit: "cm", labelKey: "self_care_metric_abdomen", min: 50, max: 160, group: "circumference" },
];

export function MetricsCard({ metrics, onMetricChange }: MetricsCardProps) {
  const { t } = useTranslation();
  const headingId = "self-care-metrics-heading";
  
  const basicMetrics = METRIC_FIELDS.filter(f => f.group === "basic");
  const circumferenceMetrics = METRIC_FIELDS.filter(f => f.group === "circumference");

  return (
    <Card role="region" aria-labelledby={headingId} className="grid gap-4">
      <CardHeader className="gap-2">
        <h2 id={headingId} className="text-xl font-semibold">
          {t("self_care_metrics_heading")}
        </h2>
      </CardHeader>
      <CardContent>
        <!-- Basic Metrics Section -->
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {t("self_care_metrics_basic_group")}
          </h3>
          <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3">
            {basicMetrics.map((field) => (
              <label key={field.metricType} className="grid gap-2 font-semibold">
                <span className="text-sm text-muted-foreground">{t(field.labelKey)}</span>
                <div className="flex items-center overflow-hidden rounded-2xl border border-input bg-white/95">
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={metrics[field.metricType]}
                    min={field.min}
                    max={field.max}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onMetricChange(field.metricType, event.target.value)
                    }
                  />
                  <span className="px-3 text-sm font-medium text-muted-foreground">{field.unit}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <!-- Circumference Measurements Section -->
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            {t("self_care_metrics_circumference_group")}
          </h3>
          <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3">
            {circumferenceMetrics.map((field) => (
              <label key={field.metricType} className="grid gap-2 font-semibold">
                <span className="text-sm text-muted-foreground">{t(field.labelKey)}</span>
                <div className="flex items-center overflow-hidden rounded-2xl border border-input bg-white/95">
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={metrics[field.metricType]}
                    min={field.min}
                    max={field.max}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onMetricChange(field.metricType, event.target.value)
                    }
                  />
                  <span className="px-3 text-sm font-medium text-muted-foreground">{field.unit}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- metrics-card.test.tsx`
Expected: PASS

- [ ] **Step 5: Update component tests to match new structure**

```typescript
// src/features/self-care/components/metrics-card.test.tsx
// Update existing tests to use new MetricsCardProps type

describe("MetricsCard", () => {
  const mockProps = {
    metrics: {
      height: "170",
      weight: "70",
      bodyFat: "15",
      rightArm: "30",
      leftArm: "30",
      rightLeg: "55",
      leftLeg: "55",
      abdomen: "85",
    },
    onMetricChange: jest.fn(),
  };

  it("calls onMetricChange when input changes", async () => {
    const { rerender } = render(<MetricsCard {...mockProps} />);
    
    const rightArmInput = screen.getByLabelText("Right arm");
    fireEvent.change(rightArmInput, { target: { value: "31" } });
    
    expect(mockProps.onMetricChange).toHaveBeenCalledWith("rightArm", "31");
  });

  it("validates min/max ranges", () => {
    render(<MetricsCard {...mockProps} />);
    
    const rightArmInput = screen.getByLabelText("Right arm") as HTMLInputElement;
    expect(rightArmInput.min).toBe("15");
    expect(rightArmInput.max).toBe("60");
  });
});
```

- [ ] **Step 6: Run all tests to verify no regressions**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/features/self-care/components/metrics-card.tsx
git add src/features/self-care/components/metrics-card.test.tsx
git commit -m "feat(self-care): add grouped circumference measurements to metrics card

- Add 5 new circumference measurement inputs (right/left arm, right/left leg, abdomen)
- Group fields into 'Basic Metrics' and 'Circumference Measurements' sections
- Add validation with min/max attributes
- Update tests for new structure"
```

---

### Task 5: Update History Graph Query

**Files:**
- Modify: `src/features/history/history-graph-query.ts`

- [ ] **Step 1: Add labels and units for new metric types**

```typescript
// src/features/history/history-graph-query.ts (lines 32-42)
const METRIC_LABELS: Record<MetricType, string> = {
  height: "Height",
  weight: "Weight",
  bodyFat: "Body fat",
  // New circumference measurements
  rightArm: "Right arm",
  leftArm: "Left arm",
  rightLeg: "Right leg",
  leftLeg: "Left leg",
  abdomen: "Abdomen",
};

const METRIC_UNITS: Record<MetricType, string> = {
  height: "cm",
  weight: "kg",
  bodyFat: "%",
  // New circumference measurements - all in cm
  rightArm: "cm",
  leftArm: "cm",
  rightLeg: "cm",
  leftLeg: "cm",
  abdomen: "cm",
};
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors (all MetricType values now have labels and units)

- [ ] **Step 3: Write test for new metric types**

```typescript
// src/features/history/history-graph-query.test.ts
import { buildHistoryGraphSeries } from "./history-graph-query";
import { appDb } from "@/features/storage/app-db";

describe("buildHistoryGraphSeries", () => {
  it("returns correct label and unit for circumference metrics", async () => {
    const series = await buildHistoryGraphSeries({
      range: { start: "2026-01-01", end: "2026-01-31" },
      metric: { kind: "metric", metricType: "abdomen" },
    });
    
    expect(series.label).toBe("Abdomen");
    expect(series.unit).toBe("cm");
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- history-graph-query.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/history/history-graph-query.ts
git add src/features/history/history-graph-query.test.ts
git commit -m "feat(history): add labels and units for circumference measurements

- Add labels for rightArm, leftArm, rightLeg, leftLeg, abdomen
- Add units (all 'cm') for new metric types
- Add tests for new metric types"
```

---

### Task 6: Update History Graphs UI - Add Grouped Dropdown

**Files:**
- Modify: `src/features/history/components/history-graphs.tsx`

- [ ] **Step 1: Create grouped options structure**

```typescript
// src/features/history/components/history-graphs.tsx (lines 11-22)
type MetricOption = {
  value: GraphMetricSelection;
  label: string;
};

type MetricOptionGroup = {
  label: string;
  options: MetricOption[];
};

const METRIC_OPTIONS_GROUPED: MetricOptionGroup[] = [
  {
    label: "Basic Metrics",
    options: [
      { value: { kind: "metric", metricType: "weight" }, label: "Weight" },
      { value: { kind: "metric", metricType: "bodyFat" }, label: "Body fat" },
      { value: { kind: "metric", metricType: "height" }, label: "Height" },
    ]
  },
  {
    label: "Circumference",
    options: [
      { value: { kind: "metric", metricType: "rightArm" }, label: "Right arm" },
      { value: { kind: "metric", metricType: "leftArm" }, label: "Left arm" },
      { value: { kind: "metric", metricType: "rightLeg" }, label: "Right leg" },
      { value: { kind: "metric", metricType: "leftLeg" }, label: "Left leg" },
      { value: { kind: "metric", metricType: "abdomen" }, label: "Abdomen" },
    ]
  },
  {
    label: "Wellness",
    options: [
      { value: { kind: "wellness", score: "physical" }, label: "Physical wellness" },
      { value: { kind: "wellness", score: "mental" }, label: "Mental wellness" },
    ]
  }
];
```

- [ ] **Step 2: Update select element to use optgroup**

```typescript
// src/features/history/components/history-graphs.tsx (lines 84-97)
<label htmlFor="metric-selector" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
  <span style={{ fontWeight: "600" }}>{t("history_graph_metric_label")}</span>
  <select
    id="metric-selector"
    value={JSON.stringify(selectedMetric)}
    onChange={(e) => setSelectedMetric(JSON.parse(e.currentTarget.value))}
  >
    {METRIC_OPTIONS_GROUPED.map((group) => (
      <optgroup key={group.label} label={group.label}>
        {group.options.map((option, index) => (
          <option key={index} value={JSON.stringify(option.value)}>
            {option.label}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
</label>
```

- [ ] **Step 3: Write test for grouped dropdown**

```typescript
// src/features/history/components/history-graphs.test.tsx
import { render, screen } from "@testing-library/react";
import { HistoryGraphs } from "./history-graphs";

describe("HistoryGraphs", () => {
  it("renders grouped dropdown with optgroups", () => {
    render(<HistoryGraphs />);
    
    const select = screen.getByLabelText("Select metric to graph");
    const optgroups = select.querySelectorAll("optgroup");
    
    expect(optgroups).toHaveLength(3);
    expect(optgroups[0]).toHaveAttribute("label", "Basic Metrics");
    expect(optgroups[1]).toHaveAttribute("label", "Circumference");
    expect(optgroups[2]).toHaveAttribute("label", "Wellness");
  });

  it("renders all 10 metric options", () => {
    render(<HistoryGraphs />);
    
    const select = screen.getByLabelText("Select metric to graph");
    const options = select.querySelectorAll("option");
    
    expect(options).toHaveLength(10); // 3 basic + 5 circumference + 2 wellness
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- history-graphs.test.tsx`
Expected: PASS

- [ ] **Step 5: Run all tests to verify no regressions**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/features/history/components/history-graphs.tsx
git add src/features/history/components/history-graphs.test.tsx
git commit -m "feat(history): add grouped dropdown for circumference measurements

- Create METRIC_OPTIONS_GROUPED with 3 groups (Basic, Circumference, Wellness)
- Render <optgroup> elements for better dropdown organization
- Add tests for grouped dropdown structure
- Users can now graph all 5 new circumference measurements"
```

---

### Task 7: Integration Testing & Validation

**Files:**
- Test: Manual testing required

- [ ] **Step 1: Test input validation**

1. Open Self-Care page
2. Try entering values outside validation ranges:
   - Right arm: enter 10 (should show validation error or prevent input)
   - Right arm: enter 70 (should show validation error or prevent input)
   - Abdomen: enter 500 (should show validation error or prevent input)
3. Verify min/max attributes are enforced

- [ ] **Step 2: Test data persistence**

1. Enter values for all 8 metrics (3 basic + 5 circumference)
2. Save the data
3. Reload the page
4. Verify all values are preserved

- [ ] **Step 3: Test history graph rendering**

1. Go to History page
2. Open dropdown - verify grouped structure with optgroup headers
3. Select "Right arm" - verify graph renders correctly
4. Select "Abdomen" - verify graph renders correctly
5. Verify graph labels and units are correct (e.g., "Abdomen" with "cm")

- [ ] **Step 4: Test i18n (English and Japanese)**

1. Switch language to Japanese
2. Verify Self-Care page shows Japanese labels ("右腕", "左腕", etc.)
3. Verify group headings are in Japanese ("基本測定", "周径測定")
4. Switch back to English - verify English labels

- [ ] **Step 5: Test backward compatibility**

1. Verify existing data (height, weight, body fat) still displays correctly
2. Verify existing history graphs still work
3. Verify no data loss or corruption

- [ ] **Step 6: Commit (if any fixes needed)**

```bash
git add .
git commit -m "fix: address issues found during integration testing"
```

---

## Self-Review Checklist

**1. Spec coverage:** 
- ✅ Input fields for 5 circumference measurements (Task 4)
- ✅ UI organization with grouped sections (Task 4)
- ✅ Validation with min/max ranges (Task 4)
- ✅ History graphs for all 5 measurements (Task 5, Task 6)
- ✅ Grouped dropdown with `<optgroup>` (Task 6)
- ✅ i18n support for EN/JA (Task 2, Task 3)

**2. Placeholder scan:**
- ✅ No "TBD", "TODO", or "implement later" found
- ✅ All steps contain actual code
- ✅ No "Add appropriate error handling" without implementation

**3. Type consistency:**
- ✅ `MetricType` values are consistent across all tasks
- ✅ `rightArm`, `leftArm`, `rightLeg`, `leftLeg`, `abdomen` used consistently
- ✅ `GraphMetricSelection` type is used correctly in Task 6

**4. File paths:**
- ✅ All file paths are correct and verified
- ✅ Line numbers provided where helpful

---

## Execution Handoff

**Plan complete and saved to:** `docs/superpowers/plans/2026-06-08-circumference-measurements.md`

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
