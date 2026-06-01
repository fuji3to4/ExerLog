Plan: UI refresh -> shadcn/ui (2026-06-01)

Scope
- Migrate visual foundation to Tailwind + shadcn/ui and update global tokens.
- Replace native selects and modal primitives with Radix/shadcn primitives.
- Migrate screens: Today, Self-care, Library, History, Settings, Library/Exercise detail.

Steps
1. Bootstrap: Add Tailwind/PostCSS, add shadcn primitives, token mapping (DONE).
2. Core primitives: Implement Button, Card, Select, Dialog, Textarea (DONE).
3. App shell + Today/Self-care migration + tests (DONE).
4. Library/History/Settings migration + tests (IN PROGRESS/COMPLETED).
5. Clean legacy globals, ensure theme tests (DONE).
6. Fix test-time issues (jsdom polyfills, next/font mock) (DONE).
7. Full verification: run vitest sequentially and next build (DONE).
8. Prepare PR: include DESIGN.md, plan, migration notes (IN PROGRESS).

Validation checklist
- [x] Token mapping present in src/app/globals.css
- [x] shadcn primitives under src/components/ui
- [x] Replaced native selects in Library and Settings
- [x] Added ARIA roles for history toggle
- [x] Vitest full run passing
- [x] Next.js production build successful

Next actions
- Final review of migrated screens and accessibility audit.
- Update contributor docs with migration notes and component usage examples.
