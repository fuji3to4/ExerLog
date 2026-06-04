# History Graphs Recharts Migration

## Date
2026-06-04

## Scope
Migrate the history graphs from manual SVG rendering to Recharts for improved maintainability, interactivity, readability, and modern aesthetics.

## Goals
- Replace manual SVG line chart with a polished Recharts `LineChart`
- Add visual polish: gradient area fill, subtle grid, custom tooltip
- Support both automatic (responsive) and manual resizing
- Keep all existing features (metric selection, date presets, loading/empty states, i18n)
- Improve ergonomics for future changes (isolated chart component, testable units)

## Architecture

### Component separation
```
┌─────────────────────────────────────┐
│  HistoryGraphs (Container)          │
│  ┌───────────────────────────────┐  │
│  │ Metric Selector (select)      │  │
│  │ Date Range Presets (buttons)  │  │
│  ├───────────────────────────────┤  │
│  │                               │  │
│  │  HistoryChart (Presentational)│  │
│  │  - Recharts LineChart         │  │
│  │  - Area fill with gradient    │  │
│  │  - Custom tooltip             │  │
│  │                               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Components

### HistoryGraphs (Container)
**Responsibilities:**
- Fetch data via `buildHistoryGraphSeries` using current `metric` and `dateRange`
- Manage state: `selectedMetric`, `dateRangePreset`, `series`, `loading`
- Render controls (metric `<select>`, date preset `<button>` list)
- Render loading / empty states
- Render `HistoryChart` when data is present

### HistoryChart (Presentational)
**Props:**
```ts
type HistoryChartProps = {
  series: GraphSeries;
};
```

**Responsibilities:**
- Render a `LineChart` inside `ResponsiveContainer`
- Provide custom tooltip and axis formatting
- Apply gradient area fill under the line
- Export from `history-chart.tsx`

## Data Flow

1. `HistoryGraphs` calls `buildHistoryGraphSeries({ range, metric })` inside `useEffect`
2. On success, `series` state is set
3. `HistoryGraphs` renders `<HistoryChart series={series} />` when `series` has data points
4. `HistoryChart` maps `GraphPoint[]` to Recharts data shape and draws the chart
5. `ResponsiveContainer` makes the chart fill its parent; the parent wrapper handles both responsive and manual resizing

## Resizing Strategy

| Aspect | Implementation |
|---|---|
| **Automatic (responsive)** | `ResponsiveContainer width="100%" height="100%"` inside a wrapper that fills available space |
| **Manual (user resize)** | Wrapper CSS: `resize: both; overflow: hidden; min-width: 300px; min-height: 250px;` with a default height |
| **Container behavior** | Chart wrapper is a block-level element in the layout; resizing the parent naturally resizes the chart |

## Recharts Configuration

| Element | Details |
|---|---|
| **Chart type** | `LineChart` |
| **Area fill** | `<defs>` linear gradient: top = brand color, bottom = transparent |
| **Grid** | Horizontal only, light color (`#e5e7eb`) |
| **Axes** | X: date (minimal tick formatter), Y: numeric, left-aligned, includes unit |
| **Tooltip** | Custom component: card style showing date, value, and unit |
| **Line style** | Brand color (`#2563eb` or design system primary), width 2–3px, dots on hover |
| **Responsive** | `ResponsiveContainer` with `100%` width and height |

## Files Changed

| File | Action | Description |
|---|---|---|
| `package.json` | Update | Add `recharts` to dependencies |
| `src/features/history/components/history-graphs.tsx` | Edit | Remove SVG rendering; import and render `HistoryChart`; keep controls and loading/empty states |
| `src/features/history/components/history-chart.tsx` | **Create** | New Recharts-based chart component |
| `src/features/history/components/history-graphs.test.tsx` | Edit | Update tests to account for component split and any DOM changes |
| `src/features/history/components/history-chart.test.tsx` | **Create** | Unit tests for `HistoryChart` with mock `GraphSeries` data |

## Preserved Features

- Metric selection: Weight, Body fat, Height, Physical wellness, Mental wellness
- Date range presets: 7d, 30d, 90d, all
- Loading indicator and empty data message
- i18n (translation keys remain the same)
- `GraphMetricSelection` and `GraphSeries` type contracts

## Testing Plan

- `HistoryChart` renders without crashing and shows correct number of points for a mock `GraphSeries`
- `HistoryGraphs` fetches data on metric or date range change
- Loading and empty states are shown correctly
- Tooltip appears on hovering chart points

## Open Questions / TBD

- None.
