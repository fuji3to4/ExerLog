# History Graphs Recharts Migration - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the history graphs from manual SVG to Recharts with visual polish, preserving all existing features.

**Architecture:** Split chart rendering into a presentational `HistoryChart` component. `HistoryGraphs` manages data and controls. Recharts handles drawing via `ResponsiveContainer`. A resize-aware wrapper handles both automatic and manual resizing.

**Tech Stack:** React, TypeScript, Recharts (added to deps), existing Dexie DB.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `package.json` | Edit | Add `recharts` dependency |
| `src/features/history/components/history-chart.tsx` | **Create** | Recharts `LineChart` with gradient area, custom tooltip, formatting |
| `src/features/history/components/history-graphs.tsx` | Edit | Remove SVG rendering; wire `HistoryChart`; keep all controls/loading/empty states |
| `src/features/history/components/history-chart.test.tsx` | **Create** | Unit tests for `HistoryChart` |
| `src/features/history/components/history-graphs.test.tsx` | Edit | Update interaction tests for the container |

---

## Task 1: Install Recharts

**Files:**
- Modify: `package.json`
- No new tests (manual verification step)

- [ ] **Step 1: Add `recharts` to dependencies**

```json
"recharts": "^2.15.3"
```

- [ ] **Step 2: Install packages**

Run: `npm install`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: install recharts for history graphs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Create `HistoryChart` (Presentational Component)

**Files:**
- Create: `src/features/history/components/history-chart.tsx`
- Test: Create `src/features/history/components/history-chart.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/history/components/history-chart.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HistoryChart } from "./history-chart";
import type { GraphSeries } from "@/features/history/history-graph-query";

const mockSeries: GraphSeries = {
  label: "Weight",
  unit: "kg",
  points: [
    { date: "2026-06-01", value: 70.0 },
    { date: "2026-06-02", value: 70.5 },
    { date: "2026-06-03", value: 70.2 },
  ],
};

describe("HistoryChart", () => {
  it("renders without crashing", () => {
    render(<HistoryChart series={mockSeries} />);
    expect(document.querySelector(".recharts-wrapper")).toBeInTheDocument();
  });

  it("displays the correct number of data points", () => {
    render(<HistoryChart series={mockSeries} />);
    const circles = document.querySelectorAll(".recharts-dot");
    expect(circles.length).toBe(mockSeries.points.length);
  });
});
```

- [ ] **Step 2: Run the test — expect it to fail**

Run: `npx vitest run src/features/history/components/history-chart.test.tsx`

Expected: FAIL — `HistoryChart` not defined

- [ ] **Step 3: Create the component**

Create `src/features/history/components/history-chart.tsx`:

```tsx
"use client";

import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GraphSeries } from "@/features/history/history-graph-query";

type HistoryChartProps = {
  series: GraphSeries;
};

function formatDate(tick: string): string {
  const date = new Date(tick + "T00:00:00");
  return date.toLocaleDateString("default", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "0.5rem 0.75rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem" }}>
          {new Date(label + "T00:00:00").toLocaleDateString()}
        </p>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem" }}>
          {payload[0].value} {payload[0].payload.unit}
        </p>
      </div>
    );
  }
  return null;
}

export function HistoryChart({ series }: HistoryChartProps) {
  const chartData = series.points.map((point) => ({
    ...point,
    unit: series.unit,
  }));

  return (
    <div className="history-chart-wrapper" style={{ width: "100%", height: "400px", resize: "both", overflow: "hidden", minWidth: "300px", minHeight: "250px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 12, fill: "#666" }}
            axisLine={{ stroke: "#ccc" }}
            tickLine={{ stroke: "#ccc" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#666" }}
            axisLine={{ stroke: "#ccc" }}
            tickLine={{ stroke: "#ccc" }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="value" stroke="none" fill="url(#colorFill)" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run the test — expect it to pass**

Run: `npx vitest run src/features/history/components/history-chart.test.tsx`

Expected: PASS (2 passing)

- [ ] **Step 5: Commit**

```bash
git add src/features/history/components/history-chart.tsx
ngit add src/features/history/components/history-chart.test.tsx
git commit -m "feat(history): add Recharts-based HistoryChart component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Update `HistoryGraphs` to Use `HistoryChart`

**Files:**
- Edit: `src/features/history/components/history-graphs.tsx`
- Test (interaction): `src/features/history/components/history-graphs.test.tsx`

- [ ] **Step 1: Replace SVG rendering with `HistoryChart`**

Edit `src/features/history/components/history-graphs.tsx` (only the chart rendering section):

Remove this entire block inside the component:
- `calculateChartDimensions`
- `normalizeValue`
- `renderPolyline`
- The large `<svg...>...</svg>` block (lines 154–223 in current file)

Add at the top of the file:
```tsx
import { HistoryChart } from "./history-chart";
```

Replace the `<svg>` block with:
```tsx
<HistoryChart series={series} />
```

The rest of the file (controls, loading, empty states) stays unchanged.

- [ ] **Step 2: Run tests to verify no regressions**

Run: `npx vitest run src/features/history/components/history-graphs.test.tsx`

Expected: PASS (update tests if DOM assertions changed from `<svg>` to `.五角星recharts-wrapper`)

- [ ] **Step 3: Commit**

```bash
git add src/features/history/components/history-graphs.tsx
ngit add src/features/history/components/history-graphs.test.tsx
git commit -m "refactor(history): replace SVG with HistoryChart in HistoryGraphs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Final Verification & Run Full Test Suite

**Files:**
- No file changes (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`

Expected: All tests pass

- [ ] **Step 2: Visual check (dev server)**

Run: `npm run dev`

Open the app in browser, navigate to the history screen, verify:
- Chart renders correctly
- Resize handles work (resize both)
- Tooltip shows on hover
- Metric switch and date presets update data
- Loading and empty states work

- [ ] **Step 3: Final commit (cleanup)**

```bash
git add -A
git commit -m "feat(history): migrate history graphs to Recharts

Replace manual SVG chart rendering with Recharts.
- Add history-chart.tsx with gradient area, custom tooltip, and responsive sizing
- Chart supports both automatic (responsive) and manual (resize handles) sizing
- Preserve all existing features: metric selection, date presets, loading/empty states, i18n

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [x] All spec requirements mapped to a task
  - Recharts migration → Task 1 (install), Task 2 (component), Task 3 (integration)
  - Resizing → Task 2 (resize: both wrapper + ResponsiveContainer)
  - Visual polish (gradient, grid, tooltip) → Task 2 (component implementation)
  - Preserved features → Task 3 (integration), Task 4 (verification)
  - Component split → Task 2 (create HistoryChart), Task 3 (update HistoryGraphs)
- [x] No placeholders (TBD/TODO/implement later/similar to)
- [x] Exact file paths provided for every step
- [x] Code blocks included for every code step
- [x] Commands with expected output provided
- [x] Types match across tasks (`GraphSeries`, `GraphPoint`, etc.)
