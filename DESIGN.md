ExerLog UI Refresh — DESIGN SUMMARY

Goal
- Refresh the UI to match DESIGN.md specification and migrate the component foundation to shadcn/ui (Tailwind + Radix primitives).

Principles
- Token-first theming: central CSS variables mapped to Tailwind tokens.
- Component primitives: Button, Card, Select, Dialog, Tabs using shadcn + Radix.
- Mobile-first responsive layout and accessible ARIA roles.
- Preserve existing data flows and storage; visual change only.

Key components
- AppShell, BottomNav, Today, SelfCare, Library, History, Settings, ExerciseDetail.
- Shared primitives under src/components/ui (button, card, select, textarea, form primitives).

Testing & Validation
- Add jsdom polyfills in vitest.setup.ts (hasPointerCapture, scrollIntoView) and mock next/font in tests.
- Run targeted vitest suites after each migration step and a full sequential run before PR.
- Run next build to verify production rules (font loaders at module scope).

Rollout
- Work on feature branch feat/ui-refresh-shadcn-20260601 in a worktree.
- Incremental PRs per screen group; include design doc and migration plan in branch.

Notes
- Avoid breaking storage or data migrations. Most changes are presentational.
