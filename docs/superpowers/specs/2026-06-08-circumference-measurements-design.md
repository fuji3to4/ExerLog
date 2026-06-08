# Design Spec: Add Circumference Measurements

**Date**: 2026-06-08
**Status**: Draft
**Author**: AI Assistant (Brainstorming Session)

---

## 1. Overview

Add 5 new body circumference measurements to ExerLog:
- Right arm circumference
- Left arm circumference  
- Right leg circumference
- Left leg circumference
- Abdomen circumference

These measurements will be available in:
- Daily condition input (Self-Care page)
- History graphs (with grouped dropdown selection)
- Data storage (using existing flexible `dailyMetrics` system)

---

## 2. Requirements

### 2.1 Functional Requirements

1. **Input Fields**: Add 5 new input fields for circumference measurements (cm)
2. **UI Organization**: Group fields into "Basic Metrics" and "Circumference Measurements" sections
3. **Validation**: Enforce min/max ranges for each measurement
4. **History Graphs**: Allow users to graph all 5 new measurements with grouped dropdown
5. **i18n**: Support English and Japanese translations

### 2.2 Non-Functional Requirements

1. **Database**: No schema changes (use existing flexible `dailyMetrics` table)
2. **Backward Compatibility**: Existing data must remain unaffected
3. **Code Quality**: Follow existing patterns and conventions

---

## 3. Technical Design

### 3.1 Type Definitions

**File**: `src/lib/types.ts`

```typescript
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

### 3.2 Database Layer

**Files**: 
- `src/features/storage/app-db.ts`
- `src/features/storage/daily-metrics.repository.ts`

**Changes**: **NONE** - Existing schema and repository functions are already generic and will work with new metric types automatically.

### 3.3 UI Layer - Metrics Card

**File**: `src/features/self-care/components/metrics-card.tsx`

**Changes**:
1. Define metric field configuration with validation ranges:

```typescript
type MetricField = {
  metricType: MetricType;
  unit: string;
  labelKey: string;
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
```

2. Render grouped sections with headings:

```tsx
<Card>
  <CardHeader>
    <h2>{t("self_care_metrics_heading")}</h2>
  </CardHeader>
  <CardContent>
    <!-- Basic Metrics Section -->
    <div className="mb-6">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        {t("self_care_metrics_basic_group")}
      </h3>
      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3">
        <!-- Height, Weight, Body Fat inputs -->
      </div>
    </div>
    
    <!-- Circumference Measurements Section -->
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        {t("self_care_metrics_circumference_group")}
      </h3>
      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3">
        <!-- Right Arm, Left Arm, Right Leg, Left Leg, Abdomen inputs -->
      </div>
    </div>
  </CardContent>
</Card>
```

3. Add validation with `min`/`max` attributes and error handling

### 3.4 History Graph Query

**File**: `src/features/history/history-graph-query.ts`

**Changes**:
1. Add labels for new metric types:

```typescript
const METRIC_LABELS: Record<MetricType, string> = {
  height: "Height",
  weight: "Weight",
  bodyFat: "Body fat",
  rightArm: "Right arm",
  leftArm: "Left arm",
  rightLeg: "Right leg",
  leftLeg: "Left leg",
  abdomen: "Abdomen",
};
```

2. Add units for new metric types:

```typescript
const METRIC_UNITS: Record<MetricType, string> = {
  height: "cm",
  weight: "kg",
  bodyFat: "%",
  rightArm: "cm",
  leftArm: "cm",
  rightLeg: "cm",
  leftLeg: "cm",
  abdomen: "cm",
};
```

### 3.5 History Graphs UI

**File**: `src/features/history/components/history-graphs.tsx`

**Changes**:
1. Create grouped options structure:

```typescript
const METRIC_OPTIONS_GROUPED = [
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

2. Render grouped dropdown with `<optgroup>`:

```tsx
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
```

### 3.6 i18n Translations

**Files**:
- `src/features/i18n/messages/en.ts`
- `src/features/i18n/messages/ja.ts`

**Changes**:
Add translation keys for metric labels, group headings, and validation errors.

**English** (`en.ts`):
```typescript
{
  "self_care_metric_right_arm": "Right arm",
  "self_care_metric_left_arm": "Left arm",
  "self_care_metric_right_leg": "Right leg",
  "self_care_metric_left_leg": "Left leg",
  "self_care_metric_abdomen": "Abdomen",
  
  "self_care_metrics_basic_group": "Basic Metrics",
  "self_care_metrics_circumference_group": "Circumference Measurements",
  
  "metrics_validation_error": "{{label}} must be between {{min}} and {{max}} {{unit}}",
}
```

**Japanese** (`ja.ts`):
```typescript
{
  "self_care_metric_right_arm": "右腕",
  "self_care_metric_left_arm": "左腕",
  "self_care_metric_right_leg": "右脚",
  "self_care_metric_left_leg": "左脚",
  "self_care_metric_abdomen": "腹囲",
  
  "self_care_metrics_basic_group": "基本測定",
  "self_care_metrics_circumference_group": "周径測定",
  
  "metrics_validation_error": "{{label}}は{{min}}〜{{max}}{{unit}}の範囲で入力してください",
}
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Type Definitions & i18n

1. Update `src/lib/types.ts` - Add new `MetricType` values
2. Update `src/features/i18n/messages/en.ts` - Add English translations
3. Update `src/features/i18n/messages/ja.ts` - Add Japanese translations

### 4.2 Phase 2: UI Layer - Metrics Card

1. Update `src/features/self-care/components/metrics-card.tsx`:
   - Define `METRIC_FIELDS` with validation ranges
   - Render grouped sections with headings
   - Add validation logic

### 4.3 Phase 3: History Graphs

1. Update `src/features/history/history-graph-query.ts`:
   - Add labels and units for new metric types
2. Update `src/features/history/components/history-graphs.tsx`:
   - Add grouped dropdown options with `<optgroup>`

### 4.4 Phase 4: Testing & Validation

1. Test input validation (min/max ranges)
2. Test history graph rendering for new metrics
3. Test i18n (English and Japanese)
4. Verify backward compatibility (existing data unaffected)

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Validation ranges might not fit all users | Use reasonable defaults; can be adjusted later based on user feedback |
| Dropdown becomes too long (10 options) | Use grouped `<optgroup>` for better organization |
| UI might feel crowded with 8 fields | Use clear grouping with headings; consider collapsible sections in future |

---

## 6. Success Criteria

1. ✅ Users can input all 5 circumference measurements (cm)
2. ✅ Input validation prevents out-of-range values
3. ✅ UI is well-organized with grouped sections
4. ✅ All 5 new measurements can be graphed in history
5. ✅ Dropdown uses grouped sections for better UX
6. ✅ English and Japanese translations work correctly
7. ✅ Existing data remains unaffected

---

## 7. Open Questions

None at this time.

---

**End of Design Spec**
