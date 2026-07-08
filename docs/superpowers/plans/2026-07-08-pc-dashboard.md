# PC Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PC-optimized dashboard layout with sidebar navigation, automatically switching between mobile and PC layouts based on screen size.

**Architecture:** Responsive layout using shadcn/ui Sidebar component. Mobile maintains current layout, PC shows sidebar + 2x2 dashboard grid. Each dashboard card fetches data independently.

**Tech Stack:** Next.js, Tailwind CSS, shadcn/ui, Lucide Icons

---

## File Structure

### New Files
- `src/components/ui/sidebar.tsx` - shadcn Sidebar component (auto-generated)
- `src/components/app-shell/app-sidebar.tsx` - Navigation sidebar component
- `src/components/app-shell/dashboard-layout.tsx` - PC dashboard grid layout
- `src/features/dashboard/components/today-summary-card.tsx` - Today's summary widget
- `src/features/dashboard/components/graph-stats-card.tsx` - Graph statistics widget
- `src/features/dashboard/components/recommended-videos-card.tsx` - Recommended videos widget
- `src/features/dashboard/components/recent-history-card.tsx` - Recent history widget
- `src/features/dashboard/components/dashboard-card.tsx` - Wrapper component for dashboard cards

### Modified Files
- `src/components/app-shell/app-shell.tsx` - Add responsive layout switching
- `src/components/app-shell/bottom-nav.tsx` - Hide on PC
- `src/app/globals.css` - Add sidebar styles
- `src/app/layout.tsx` - Wrap with SidebarProvider

---

## Task 1: Install shadcn/ui Sidebar Component

**Files:**
- Create: `src/components/ui/sidebar.tsx` (auto-generated)
- Create: `src/components/ui/sidebar.test.tsx`

- [ ] **Step 1: Install sidebar component**

```bash
npx shadcn@latest add sidebar
```

Expected: Creates `src/components/ui/sidebar.tsx` with Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarInset components.

- [ ] **Step 2: Verify installation**

```bash
ls -la src/components/ui/sidebar.tsx
```

Expected: File exists with TypeScript types exported.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sidebar.tsx
git commit -m "feat: add shadcn/ui sidebar component"
```

---

## Task 2: Create AppSidebar Component

**Files:**
- Create: `src/components/app-shell/app-sidebar.tsx`
- Create: `src/components/app-shell/app-sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/app-shell/app-sidebar.test.tsx
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
  it("renders all navigation items", () => {
    render(<AppSidebar currentPath="/" />);
    
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Self-care")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights current page", () => {
    render(<AppSidebar currentPath="/library" />);
    
    const libraryLink = screen.getByText("Library").closest("a");
    expect(libraryLink).toHaveAttribute("aria-current", "page");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/app-shell/app-sidebar.test.tsx
```

Expected: FAIL with "Cannot find module './app-sidebar'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/components/app-shell/app-sidebar.tsx
"use client";

import Link from "next/link";
import { Home, BookOpen, LineChart, Heart, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type AppSidebarProps = {
  currentPath: string;
};

const navItems = [
  { href: "/", icon: Home, label: "Today" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/history", icon: LineChart, label: "History" },
  { href: "/self-care", icon: Heart, label: "Self-care" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppSidebar({ currentPath }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>ExerLog</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/app-shell/app-sidebar.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/app-sidebar.tsx src/components/app-shell/app-sidebar.test.tsx
git commit -m "feat: add AppSidebar navigation component"
```

---

## Task 3: Create DashboardCard Wrapper

**Files:**
- Create: `src/features/dashboard/components/dashboard-card.tsx`
- Create: `src/features/dashboard/components/dashboard-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/dashboard/components/dashboard-card.test.tsx
import { render, screen } from "@testing-library/react";
import { DashboardCard } from "./dashboard-card";

describe("DashboardCard", () => {
  it("renders title and children", () => {
    render(
      <DashboardCard title="Test Title">
        <p>Test content</p>
      </DashboardCard>
    );
    
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DashboardCard title="Test" className="custom-class">
        <p>Content</p>
      </DashboardCard>
    );
    
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/dashboard/components/dashboard-card.test.tsx
```

Expected: FAIL with "Cannot find module './dashboard-card'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/dashboard-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function DashboardCard({ title, children, className }: DashboardCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/dashboard/components/dashboard-card.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/components/dashboard-card.tsx src/features/dashboard/components/dashboard-card.test.tsx
git commit -m "feat: add DashboardCard wrapper component"
```

---

## Task 4: Create TodaySummaryCard

**Files:**
- Create: `src/features/dashboard/components/today-summary-card.tsx`
- Create: `src/features/dashboard/components/today-summary-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/dashboard/components/today-summary-card.test.tsx
import { render, screen } from "@testing-library/react";
import { TodaySummaryCard } from "./today-summary-card";

// Mock the useTodayData hook
vi.mock("@/features/today/use-today-data", () => ({
  useTodayData: () => ({
    isHydrated: true,
    physicalScore: 4,
    mentalScore: 3,
    recommendations: [
      { id: "1", title: "Morning Stretch" },
      { id: "2", title: "Yoga Flow" },
    ],
  }),
}));

describe("TodaySummaryCard", () => {
  it("renders wellness scores", () => {
    render(<TodaySummaryCard />);
    
    expect(screen.getByText("Physical: 4")).toBeInTheDocument();
    expect(screen.getByText("Mental: 3")).toBeInTheDocument();
  });

  it("renders recommended exercises", () => {
    render(<TodaySummaryCard />);
    
    expect(screen.getByText("Morning Stretch")).toBeInTheDocument();
    expect(screen.getByText("Yoga Flow")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/dashboard/components/today-summary-card.test.tsx
```

Expected: FAIL with "Cannot find module './today-summary-card'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/today-summary-card.tsx
"use client";

import { useTodayData } from "@/features/today/use-today-data";
import { toDayKey } from "@/lib/date/day-key";
import { DashboardCard } from "./dashboard-card";

export function TodaySummaryCard() {
  const date = toDayKey(new Date());
  const { isHydrated, physicalScore, mentalScore, recommendations } = useTodayData(date);

  if (!isHydrated) {
    return <DashboardCard title="Today's Summary">Loading...</DashboardCard>;
  }

  return (
    <DashboardCard title="Today's Summary">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Physical</p>
            <p className="text-2xl font-bold">{physicalScore}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">Mental</p>
            <p className="text-2xl font-bold">{mentalScore}</p>
          </div>
        </div>
        
        <div>
          <p className="mb-2 text-sm font-medium">Recommended</p>
          <ul className="space-y-1">
            {recommendations.slice(0, 3).map((exercise) => (
              <li key={exercise.id} className="text-sm">
                {exercise.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/dashboard/components/today-summary-card.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/components/today-summary-card.tsx src/features/dashboard/components/today-summary-card.test.tsx
git commit -m "feat: add TodaySummaryCard dashboard widget"
```

---

## Task 5: Create GraphStatsCard

**Files:**
- Create: `src/features/dashboard/components/graph-stats-card.tsx`
- Create: `src/features/dashboard/components/graph-stats-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/dashboard/components/graph-stats-card.test.tsx
import { render, screen } from "@testing-library/react";
import { GraphStatsCard } from "./graph-stats-card";

// Mock the buildHistoryGraphSeries function
vi.mock("@/features/history/history-graph-query", () => ({
  buildHistoryGraphSeries: () => Promise.resolve({
    points: [
      { date: "2026-07-01", value: 70 },
      { date: "2026-07-02", value: 71 },
    ],
  }),
}));

describe("GraphStatsCard", () => {
  it("renders graph title", () => {
    render(<GraphStatsCard />);
    
    expect(screen.getByText("Graph Statistics")).toBeInTheDocument();
  });

  it("renders date range buttons", () => {
    render(<GraphStatsCard />);
    
    expect(screen.getByText("7d")).toBeInTheDocument();
    expect(screen.getByText("30d")).toBeInTheDocument();
    expect(screen.getByText("90d")).toBeInTheDocument();
    expect(screen.getByText("all")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/dashboard/components/graph-stats-card.test.tsx
```

Expected: FAIL with "Cannot find module './graph-stats-card'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/graph-stats-card.tsx
"use client";

import { useEffect, useState } from "react";
import { buildHistoryGraphSeries } from "@/features/history/history-graph-query";
import { HistoryChart } from "@/features/history/components/history-chart";
import { DashboardCard } from "./dashboard-card";

type DateRangePreset = "7d" | "30d" | "90d" | "all";

export function GraphStatsCard() {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("7d");
  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadGraphData() {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = today.toISOString().split("T")[0]!;
      
      const days = dateRangePreset === "7d" ? 7 : dateRangePreset === "30d" ? 30 : dateRangePreset === "90d" ? 90 : 365;
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days + 1);
      const start = startDate.toISOString().split("T")[0]!;

      try {
        const graphSeries = await buildHistoryGraphSeries({
          range: { start, end: endDate },
          metric: { kind: "metric", metricType: "weight" },
        });

        if (isActive) {
          setSeries(graphSeries);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadGraphData();

    return () => {
      isActive = false;
    };
  }, [dateRangePreset]);

  return (
    <DashboardCard title="Graph Statistics">
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["7d", "30d", "90d", "all"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setDateRangePreset(preset)}
              className={`rounded-md px-3 py-1 text-sm ${
                dateRangePreset === preset
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && series && series.points.length > 0 && (
          <div className="overflow-x-auto">
            <HistoryChart series={series} />
          </div>
        )}

        {!loading && (!series || series.points.length === 0) && (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </div>
    </DashboardCard>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/dashboard/components/graph-stats-card.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/components/graph-stats-card.tsx src/features/dashboard/components/graph-stats-card.test.tsx
git commit -m "feat: add GraphStatsCard dashboard widget"
```

---

## Task 6: Create RecommendedVideosCard

**Files:**
- Create: `src/features/dashboard/components/recommended-videos-card.tsx`
- Create: `src/features/dashboard/components/recommended-videos-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/dashboard/components/recommended-videos-card.test.tsx
import { render, screen } from "@testing-library/react";
import { RecommendedVideosCard } from "./recommended-videos-card";

// Mock the useTodayData hook
vi.mock("@/features/today/use-today-data", () => ({
  useTodayData: () => ({
    isHydrated: true,
    recommendations: [
      { id: "1", title: "Morning Stretch", videoUrl: "https://youtube.com/watch?v=1" },
      { id: "2", title: "Yoga Flow", videoUrl: "https://youtube.com/watch?v=2" },
    ],
  }),
}));

describe("RecommendedVideosCard", () => {
  it("renders video titles", () => {
    render(<RecommendedVideosCard />);
    
    expect(screen.getByText("Morning Stretch")).toBeInTheDocument();
    expect(screen.getByText("Yoga Flow")).toBeInTheDocument();
  });

  it("renders play buttons", () => {
    render(<RecommendedVideosCard />);
    
    const playButtons = screen.getAllByText("▶");
    expect(playButtons).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/dashboard/components/recommended-videos-card.test.tsx
```

Expected: FAIL with "Cannot find module './recommended-videos-card'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/recommended-videos-card.tsx
"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useTodayData } from "@/features/today/use-today-data";
import { toDayKey } from "@/lib/date/day-key";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";
import { DashboardCard } from "./dashboard-card";

export function RecommendedVideosCard() {
  const date = toDayKey(new Date());
  const { isHydrated, recommendations } = useTodayData(date);

  if (!isHydrated) {
    return <DashboardCard title="Recommended Videos">Loading...</DashboardCard>;
  }

  return (
    <DashboardCard title="Recommended Videos">
      <div className="space-y-3">
        {recommendations.slice(0, 4).map((exercise) => {
          const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
          return (
            <Link
              key={exercise.id}
              href={`/exercises?exerciseId=${encodeURIComponent(exercise.id)}`}
              className="group flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted"
            >
              {thumbnailUrl && (
                <div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-md">
                  <img
                    src={thumbnailUrl}
                    alt={exercise.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{exercise.title}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/dashboard/components/recommended-videos-card.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/components/recommended-videos-card.tsx src/features/dashboard/components/recommended-videos-card.test.tsx
git commit -m "feat: add RecommendedVideosCard dashboard widget"
```

---

## Task 7: Create RecentHistoryCard

**Files:**
- Create: `src/features/dashboard/components/recent-history-card.tsx`
- Create: `src/features/dashboard/components/recent-history-card.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/dashboard/components/recent-history-card.test.tsx
import { render, screen } from "@testing-library/react";
import { RecentHistoryCard } from "./recent-history-card";

// Mock the history query functions
vi.mock("@/features/history/history-query", () => ({
  listCompletedDaysInMonth: () => Promise.resolve(["2026-07-01", "2026-07-03", "2026-07-05"]),
}));

describe("RecentHistoryCard", () => {
  it("renders recent activity", async () => {
    render(<RecentHistoryCard />);
    
    expect(screen.getByText("Recent History")).toBeInTheDocument();
  });

  it("shows completed days", async () => {
    render(<RecentHistoryCard />);
    
    // Wait for data to load
    await screen.findByText("3 days completed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/dashboard/components/recent-history-card.test.tsx
```

Expected: FAIL with "Cannot find module './recent-history-card'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/recent-history-card.tsx
"use client";

import { useEffect, useState } from "react";
import { listCompletedDaysInMonth } from "@/features/history/history-query";
import { toDayKey } from "@/lib/date/day-key";
import { DashboardCard } from "./dashboard-card";

export function RecentHistoryCard() {
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadRecentHistory() {
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      
      try {
        const days = await listCompletedDaysInMonth(currentMonth);
        if (isActive) {
          // Get last 7 days
          const recentDays = days.slice(-7);
          setCompletedDays(recentDays);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadRecentHistory();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <DashboardCard title="Recent History">
      <div className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {!loading && completedDays.length === 0 && (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}

        {!loading && completedDays.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {completedDays.length} days completed
            </p>
            <div className="flex gap-1">
              {completedDays.map((day) => (
                <div
                  key={day}
                  className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center text-xs font-medium text-green-800"
                  title={day}
                >
                  {new Date(day).getDate()}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardCard>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/dashboard/components/recent-history-card.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/components/recent-history-card.tsx src/features/dashboard/components/recent-history-card.test.tsx
git commit -m "feat: add RecentHistoryCard dashboard widget"
```

---

## Task 8: Create DashboardLayout Component

**Files:**
- Create: `src/components/app-shell/dashboard-layout.tsx`
- Create: `src/components/app-shell/dashboard-layout.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/app-shell/dashboard-layout.test.tsx
import { render, screen } from "@testing-library/react";
import { DashboardLayout } from "./dashboard-layout";

describe("DashboardLayout", () => {
  it("renders children in grid layout", () => {
    render(
      <DashboardLayout>
        <div data-testid="card-1">Card 1</div>
        <div data-testid="card-2">Card 2</div>
        <div data-testid="card-3">Card 3</div>
        <div data-testid="card-4">Card 4</div>
      </DashboardLayout>
    );
    
    expect(screen.getByTestId("card-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-2")).toBeInTheDocument();
    expect(screen.getByTestId("card-3")).toBeInTheDocument();
    expect(screen.getByTestId("card-4")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/app-shell/dashboard-layout.test.tsx
```

Expected: FAIL with "Cannot find module './dashboard-layout'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/components/app-shell/dashboard-layout.tsx
import { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/app-shell/dashboard-layout.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/dashboard-layout.tsx src/components/app-shell/dashboard-layout.test.tsx
git commit -m "feat: add DashboardLayout grid component"
```

---

## Task 9: Update AppShell for Responsive Layout

**Files:**
- Modify: `src/components/app-shell/app-shell.tsx`
- Modify: `src/components/app-shell/app-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// Add to existing app-shell.test.tsx
describe("AppShell responsive layout", () => {
  it("renders sidebar on PC", () => {
    // Mock window.innerWidth for PC
    Object.defineProperty(window, "innerWidth", { value: 1200, writable: true });
    
    render(<AppShell currentPath="/">Test</AppShell>);
    
    // Sidebar should be visible
    expect(screen.getByRole("navigation", { name: /sidebar/i })).toBeInTheDocument();
  });

  it("renders bottom nav on mobile", () => {
    // Mock window.innerWidth for mobile
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
    
    render(<AppShell currentPath="/">Test</AppShell>);
    
    // Bottom nav should be visible
    expect(screen.getByRole("navigation", { name: /bottom/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/app-shell/app-shell.test.tsx
```

Expected: FAIL (test doesn't exist yet)

- [ ] **Step 3: Write minimal implementation**

```typescript
// Update src/components/app-shell/app-shell.tsx
"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import { LanguageSwitcher } from "./language-switcher";
import { SyncIndicator } from "@/features/shell/components/sync-indicator";

type AppShellProps = {
  children: ReactNode;
  currentPath: string;
};

export function AppShell({ children, currentPath }: AppShellProps) {
  return (
    <SidebarProvider>
      {/* PC: Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar currentPath={currentPath} />
      </div>

      <SidebarInset>
        <div className="min-h-dvh bg-background text-foreground">
          {/* Mobile: Header */}
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur lg:hidden">
            <div className="mx-auto flex w-full max-w-screen-sm items-center justify-between px-4 py-3">
              <h1 className="text-lg font-semibold tracking-tight">ExerLog</h1>
              <div className="flex items-center gap-1">
                <LanguageSwitcher />
                <SyncIndicator />
              </div>
            </div>
          </header>

          {/* Mobile: Bottom Nav */}
          <div className="lg:hidden">
            <BottomNav currentPath={currentPath} />
          </div>

          {/* Main Content */}
          <main className="mx-auto grid w-full max-w-screen-sm gap-4 px-4 pb-28 pt-4 lg:max-w-none lg:px-8 lg:pb-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/app-shell/app-shell.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/app-shell.tsx src/components/app-shell/app-shell.test.tsx
git commit -m "feat: update AppShell with responsive layout"
```

---

## Task 10: Update Layout with SidebarProvider

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout**

```typescript
// Update src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Sofia_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageProvider } from "@/features/i18n/language-provider";
import { DbInitProvider } from "@/features/storage/db-init-provider";
import { SyncProvider } from "@/features/sync/SyncProvider";

type RootLayoutProps = {
  children: ReactNode;
};

const base = process.env.GITHUB_ACTIONS === "true" ? "/ExerLog" : "";
const sofiaSans = Sofia_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Exercise Log",
  title: {
    default: "Exercise Log",
    template: "%s | Exercise Log",
  },
  description: "A local-first exercise logging app with guided recommendations, a library, and history review.",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Exercise Log",
  },
  icons: {
    icon: [
      { url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f3f0ee",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${sofiaSans.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var value = localStorage.getItem("exerlog-language");
                var language = value === "en" ? "en" : "ja";
                document.documentElement.lang = language;
                document.documentElement.dataset.language = language;
              })();
            `,
          }}
        />
        <LanguageProvider>
          <DbInitProvider>
            <SyncProvider>{children}</SyncProvider>
          </DbInitProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify no errors**

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update root layout"
```

---

## Task 11: Add Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page**

```typescript
// src/app/dashboard/page.tsx
import { AppShell } from "@/components/app-shell/app-shell";
import { DashboardLayout } from "@/components/app-shell/dashboard-layout";
import { TodaySummaryCard } from "@/features/dashboard/components/today-summary-card";
import { GraphStatsCard } from "@/features/dashboard/components/graph-stats-card";
import { RecommendedVideosCard } from "@/features/dashboard/components/recommended-videos-card";
import { RecentHistoryCard } from "@/features/dashboard/components/recent-history-card";

export default function DashboardPage() {
  return (
    <AppShell currentPath="/dashboard">
      <DashboardLayout>
        <TodaySummaryCard />
        <GraphStatsCard />
        <RecommendedVideosCard />
        <RecentHistoryCard />
      </DashboardLayout>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify page loads**

```bash
npm run dev
```

Expected: Dashboard page loads at `/dashboard` with 2x2 grid layout on PC.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add dashboard page"
```

---

## Task 12: Update Global CSS for Sidebar

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add sidebar styles**

```css
/* Add to src/app/globals.css */
:root {
  /* Sidebar colors */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: 217.2 91.2% 59.8%;
}

.dark {
  --sidebar-background: 240 5.9% 10%;
  --sidebar-foreground: 240 4.8% 95.9%;
  --sidebar-primary: 224.3 76.3% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 3.7% 15.9%;
  --sidebar-accent-foreground: 240 4.8% 95.9%;
  --sidebar-border: 240 3.7% 15.9%;
  --sidebar-ring: 217.2 91.2% 59.8%;
}
```

- [ ] **Step 2: Verify styles apply**

```bash
npm run dev
```

Expected: Sidebar displays with correct colors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add sidebar color variables"
```

---

## Task 13: Update Navigation Links

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/library/page.tsx`
- Modify: `src/app/history/page.tsx`
- Modify: `src/app/self-care/page.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Update home page to use dashboard on PC**

```typescript
// Update src/app/page.tsx
import { AppShell } from "@/components/app-shell/app-shell";
import { TodayScreen } from "@/features/today/components/today-screen";
import { DashboardLayout } from "@/components/app-shell/dashboard-layout";
import { TodaySummaryCard } from "@/features/dashboard/components/today-summary-card";
import { GraphStatsCard } from "@/features/dashboard/components/graph-stats-card";
import { RecommendedVideosCard } from "@/features/dashboard/components/recommended-videos-card";
import { RecentHistoryCard } from "@/features/dashboard/components/recent-history-card";

export default function HomePage() {
  return (
    <AppShell currentPath="/">
      {/* Mobile: Show TodayScreen */}
      <div className="lg:hidden">
        <TodayScreen />
      </div>
      
      {/* PC: Show Dashboard */}
      <div className="hidden lg:block">
        <DashboardLayout>
          <TodaySummaryCard />
          <GraphStatsCard />
          <RecommendedVideosCard />
          <RecentHistoryCard />
        </DashboardLayout>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify responsive behavior**

```bash
npm run dev
```

Expected: 
- Mobile (< 1024px): Shows TodayScreen
- PC (≥ 1024px): Shows Dashboard grid

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add responsive home page layout"
```

---

## Task 14: Test Responsive Behavior

**Files:**
- Create: `src/components/app-shell/responsive.test.tsx`

- [ ] **Step 1: Write comprehensive responsive tests**

```typescript
// src/components/app-shell/responsive.test.tsx
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";

describe("Responsive behavior", () => {
  const mockInnerWidth = (width: number) => {
    Object.defineProperty(window, "innerWidth", { value: width, writable: true });
    window.dispatchEvent(new Event("resize"));
  };

  beforeEach(() => {
    mockInnerWidth(375); // Default to mobile
  });

  it("shows bottom nav on mobile", () => {
    mockInnerWidth(375);
    render(<AppShell currentPath="/">Test</AppShell>);
    
    expect(screen.getByRole("navigation", { name: /bottom/i })).toBeInTheDocument();
  });

  it("hides sidebar on mobile", () => {
    mockInnerWidth(375);
    render(<AppShell currentPath="/">Test</AppShell>);
    
    expect(screen.queryByRole("navigation", { name: /sidebar/i })).not.toBeInTheDocument();
  });

  it("shows sidebar on PC", () => {
    mockInnerWidth(1200);
    render(<AppShell currentPath="/">Test</AppShell>);
    
    expect(screen.getByRole("navigation", { name: /sidebar/i })).toBeInTheDocument();
  });

  it("hides bottom nav on PC", () => {
    mockInnerWidth(1200);
    render(<AppShell currentPath="/">Test</AppShell>);
    
    expect(screen.queryByRole("navigation", { name: /bottom/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/components/app-shell/responsive.test.tsx
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-shell/responsive.test.tsx
git commit -m "test: add responsive behavior tests"
```

---

## Task 15: Final Integration Test

**Files:**
- Create: `src/features/dashboard/integration.test.tsx`

- [ ] **Step 1: Write integration test**

```typescript
// src/features/dashboard/integration.test.tsx
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";

describe("Dashboard integration", () => {
  it("renders all dashboard cards", () => {
    render(<DashboardPage />);
    
    expect(screen.getByText("Today's Summary")).toBeInTheDocument();
    expect(screen.getByText("Graph Statistics")).toBeInTheDocument();
    expect(screen.getByText("Recommended Videos")).toBeInTheDocument();
    expect(screen.getByText("Recent History")).toBeInTheDocument();
  });

  it("renders navigation sidebar", () => {
    render(<DashboardPage />);
    
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Self-care")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
npx vitest run src/features/dashboard/integration.test.tsx
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/integration.test.tsx
git commit -m "test: add dashboard integration tests"
```

---

## Summary

This plan implements:
1. shadcn/ui Sidebar component
2. AppSidebar navigation component
3. DashboardCard wrapper
4. 4 dashboard widgets (Today, Graphs, Videos, History)
5. Responsive layout switching
6. Dashboard page
7. Global CSS updates
8. Navigation updates
9. Comprehensive tests

Each task follows TDD with failing test → implementation → passing test → commit.
