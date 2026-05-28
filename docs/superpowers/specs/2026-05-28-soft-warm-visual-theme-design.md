# Soft Warm Visual Theme Design

- Date: 2026-05-28
- Project: ExerLog
- Scope: App-wide visual refresh (Today / Library / History / Self-care / Settings)

## Goal

Apply a soft, warm visual direction inspired by the provided reference image while preserving high readability. The change should affect the full app, including the bottom navigation (currently dark), without altering feature behavior or page structure.

## Design Principles

1. Warm and soft first: prioritize beige/peach family tones.
2. Readability first: keep text and interactive states clearly legible.
3. Structural stability: avoid layout/flow changes; focus on visual tokens and styling consistency.
4. Semantic colors stay semantic: success/warning/error colors remain meaningful and distinct.

## Architecture

### Theme tokenization

Introduce and centralize visual primitives in `:root` tokens in `src/app/globals.css`, then migrate hard-coded colors to these tokens in phases.

Token groups:
- Surface: app background, card, elevated panel
- Text: strong body text, muted/support text
- Border: default and emphasized borders
- Accent: primary CTA, active states, focus ring
- Semantic: success, warning, danger (existing intent preserved)

### Rollout flow

1. Define warm token palette in `:root`.
2. Apply tokens to shared primitives (`.card`, buttons, form controls, modal, navigation).
3. Align feature-specific classes with shared token usage.
4. Keep semantic state colors explicit and readable.

## Component-level Design

### App shell and page background

- Move to a warm soft background gradient (light ivory/peach family).
- Keep title and body copy with strong contrast.

### Cards and surfaces

- Cards/modals use white-to-ivory surfaces, soft warm border, and low-pressure shadow.
- Preserve current spacing and radii pattern for consistency.

### Buttons

- Primary: deep warm accent (readable white text).
- Secondary: light warm tint with dark warm text.
- Selected/active controls: accent-driven with explicit contrast.

### Bottom navigation

- Replace dark nav bar with light warm surface.
- Keep active item clearly highlighted via accent background/text treatment.
- Ensure icon/label contrast remains clear in both active and inactive states.

### Form controls

- Inputs/selects/textareas remain high legibility.
- Focus ring becomes warm-accent aligned while meeting visibility expectations.

## Data Flow / Behavior Impact

This is presentation-only work:
- No data model changes.
- No repository/query/storage changes.
- No feature logic or interaction flow changes.

## Error Handling and Risk Control

- Avoid one-shot replacement of all color literals to reduce regression risk.
- Migrate incrementally so incomplete token conversion never leaves unreadable states.
- Preserve existing semantic error/success intent rather than forcing warm recoloring.

## Testing and Validation Scope

### Functional safety

- Existing test suite should continue to pass because behavior is unchanged.

### UI verification points

- Verify visual consistency and readability across:
  - Today
  - Library (including detail screens)
  - History
  - Self-care
  - Settings
- Verify active/selected/focus states for buttons, segmented controls, and bottom nav.

### Success criteria

1. The app visually reads as soft warm across all screens.
2. Bottom navigation is transitioned from dark to light warm style.
3. Text and controls remain clearly readable and state-distinguishable.

## Out of Scope

- New themes (dark mode/theme switcher)
- Layout restructuring
- Feature additions or workflow changes
