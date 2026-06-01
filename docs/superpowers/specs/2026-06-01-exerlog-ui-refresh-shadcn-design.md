# ExerLog UI Refresh with shadcn/ui Design

- Date: 2026-06-01
- Project: ExerLog
- Scope: Full-screen redesign (Today / History / Library / Self-care / Settings)

## Goal

Renew ExerLog's visual design based on `DESIGN.md` while adapting it for product usability, and migrate the UI foundation to `shadcn/ui` + Tailwind CSS. The redesign must be mobile-first and preserve existing feature behavior and data logic.

## Confirmed Decisions

1. Scope is full app screens in one redesign stream.
2. Fidelity to `DESIGN.md` is "adapt for ExerLog usability" (not strict copy).
3. `shadcn/ui` is used proactively across major UI surfaces.
4. Mobile-first UX is the top priority.
5. Typography baseline uses Sofia Sans (MarkForMC substitute).
6. Delivery approach is token-first, then broad shadcn replacement.

## Recommended Approach (Selected)

### Token-first + broad shadcn replacement

1. Define a single token system aligned to shadcn theme variables, mapped from `DESIGN.md`'s warm editorial direction.
2. Migrate common UI primitives (buttons, cards, dialogs, inputs, tabs, sheet/popover patterns) to shadcn components.
3. Recompose feature screens on top of shared primitives, then remove legacy page-specific styling.

Why this approach:
- Ensures cross-screen consistency from the start.
- Reduces rework versus screen-by-screen visual drift.
- Keeps behavior risk low by isolating redesign to presentation layer.

## Architecture

### UI foundation

- Standardize app theming on shadcn-compatible variables (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--ring`, etc.).
- Keep warm cream + soft contrast direction from `DESIGN.md`, tuned for readability in a data-entry/productivity app context.
- Transition away from large global page-specific class styling toward utility-first styling and component variants.

### Layering model

1. **Theme/token layer**: global CSS variables and Tailwind theme mapping.
2. **Primitive/component layer**: shadcn components and local variants.
3. **Feature composition layer**: screen-specific assembly using shared primitives.
4. **Domain logic layer**: existing hooks/repositories/queries unchanged.

## Component Design

### Shared component migration targets

- Action: `Button`
- Surface/structure: `Card`, `Separator`
- Form/input: `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`
- Overlay: `Dialog`, `Sheet`, `Popover`
- Information structure: `Badge`, `Tabs`

### Radius and visual rhythm rules

To reflect `DESIGN.md` without overfitting to marketing-style visuals:
- `pill` radius for nav/chips/segmented patterns
- `lg` (~20px) for primary controls
- `xl` (~40px) for prominent containers

### App shell alignment

- Unify header, page container, and bottom nav with the new tokenized system first.
- Use shell-level consistency as baseline before per-screen migration.

## Data Flow and Behavior Impact

This redesign is presentation-focused:
- No changes to Dexie repositories, query logic, or storage schema.
- No changes to existing data contracts from `use-*-data` hooks.
- No feature-flow rewrite (logging, history, library, self-care behavior remains intact).

## Error Handling and UX Safety

- Standardize feedback surfaces using shadcn alert/inline patterns for failures and validation states.
- Avoid silent failures; ensure user-facing next action is explicit (retry, fix input, confirm destructive action).
- Use confirmation dialogs for destructive operations (delete/overwrite paths).
- Keep error discoverability mobile-first (near field + screen-visible context).

## Testing Strategy

### Validation scope

- Preserve existing behavior tests and adapt UI tests where selector/UI structure changes due to shadcn migration.
- Prioritize high-impact interactions:
  - Bottom navigation
  - Core forms and input validation
  - Modal/dialog flows
  - Primary CTA paths per screen

### Commands

- `npm test`
- `npm run build`
- `npm run lint`

### Success criteria

1. All main screens share a coherent warm visual system aligned with `DESIGN.md` direction.
2. Major UI surfaces are built on shadcn primitives rather than bespoke per-screen styling.
3. Mobile usability is improved or preserved across interaction-critical flows.
4. Domain logic behavior remains unchanged.

## Out of Scope

- Feature additions unrelated to redesign.
- Data model/storage schema changes.
- New theme modes (e.g., dark mode) unless later requested.

