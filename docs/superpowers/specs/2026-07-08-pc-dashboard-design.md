# PC Dashboard Design Spec

## Overview

Add a PC-optimized dashboard layout to ExerLog, similar to shadcn's home page. The app will automatically switch between mobile and PC layouts based on screen size (breakpoint: 1024px).

## Goals

- Provide a desktop-friendly dashboard with graphs, recommended videos, and history
- Maintain existing mobile functionality
- Use shadcn/ui Sidebar component for navigation
- Keep design consistent across mobile and PC

## Architecture

### Responsive Layout System

- **Breakpoint:** 1024px (Tailwind `lg`)
- **Mobile (< 1024px):** Current layout (header + bottom nav)
- **PC (≥ 1024px):** Sidebar + main content area

### Component Structure

```
AppShell
├── Mobile: Header + BottomNav (current)
└── PC: SidebarProvider + Sidebar + MainContent
    ├── AppSidebar (navigation)
    └── DashboardLayout (2x2 grid)
        ├── TodaySummaryCard
        ├── GraphStatsCard
        ├── RecommendedVideosCard
        └── RecentHistoryCard
```

## Sidebar Navigation

### Items

| Icon | Label | Path |
|------|-------|------|
| Home | Today | / |
| BookOpen | Library | /library |
| LineChart | History | /history |
| Heart | Self-care | /self-care |
| Settings | Settings | /settings |

### Behavior

- **PC:** Always visible, fixed left sidebar
- **Mobile:** Hidden by default, accessible via hamburger menu
- **Collapsible:** Can collapse to icon-only mode

### Implementation

Use shadcn/ui Sidebar component:
```bash
npx shadcn@latest add sidebar
```

## PC Dashboard Layout

### Grid Structure

```
┌─────────────────────────────────────────┐
│  Sidebar │ Today Summary  │ Graph Stats │
│          │                │             │
│          │ Recommended    │ Recent      │
│          │ Videos         │ History     │
└─────────────────────────────────────────┘
```

### Card Components

1. **TodaySummaryCard**
   - Physical/mental wellness scores (1-5 scale)
   - Today's recommended exercises (top 3)
   - Quick action: Log exercise, View details

2. **GraphStatsCard**
   - Weight trend graph
   - Body fat percentage
   - Wellness score trends
   - Date range selector (7d, 30d, 90d, all)

3. **RecommendedVideosCard**
   - YouTube video thumbnails
   - Play button overlay
   - Video title and duration

4. **RecentHistoryCard**
   - Last 7 days of activity
   - Exercise completed indicators (✓/✗)
   - Mini calendar showing completed days

## Responsive Behavior

### Mobile (< 1024px)

- Current layout maintained
- Bottom navigation bar
- Single column cards
- No changes to existing functionality

### PC (≥ 1024px)

- Left sidebar navigation
- 2-column grid dashboard
- Wider cards with more content
- Collapsible sidebar option

### Transition

- Smooth transition between layouts
- No flash of wrong layout on load
- Use CSS media queries for layout switching

## Data Flow

### Data Sources

- Today data: `useTodayData` hook
- History data: `useHistoryData` hook
- Library data: `listAllExercises` function

### Data Fetching

- Each card fetches its own data independently
- No shared state between cards
- Loading states for each card

### Error Handling

- Individual card error boundaries
- Graceful fallback for failed data loads

## Styling

### Color Theme

- Keep existing color variables
- Add sidebar-specific colors:
  - `--sidebar-background`
  - `--sidebar-foreground`
  - `--sidebar-primary`
  - `--sidebar-primary-foreground`
- Consistent with current design

### Typography

- Keep Sofia Sans font
- Consistent heading sizes
- Same spacing system

### Components

- Use existing Card component
- Add DashboardCard wrapper
- Consistent border-radius (1rem)

## Implementation Steps

1. Install shadcn/ui Sidebar component
2. Create AppSidebar component
3. Update AppShell for responsive layout
4. Create DashboardCard wrapper component
5. Implement TodaySummaryCard
6. Implement GraphStatsCard
7. Implement RecommendedVideosCard
8. Implement RecentHistoryCard
9. Update global CSS for sidebar
10. Test responsive behavior

## Success Criteria

- [ ] PC layout displays correctly at ≥ 1024px
- [ ] Mobile layout unchanged at < 1024px
- [ ] Sidebar navigation works on both layouts
- [ ] All dashboard cards load data correctly
- [ ] No regression in existing functionality
- [ ] Smooth transition between layouts
