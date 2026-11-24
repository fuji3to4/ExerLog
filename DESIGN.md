# ExerLog Design System: Bloom

Daylight on a working sheet. Warm off-white paper, umber ink, raised sheets instead of hairline boxes, and one terracotta signal kept for the thing you are doing right now. The app is a tool people use every day, so the system stays quiet: the day's records and the videos lead, and the chrome steps back.

Source of truth: `src/app/globals.css` (theme palettes and component rules), `src/app/tokens.css` (scale and material), `src/app/base.css` (focus, selection, reduced motion). This document describes them; when they disagree, the CSS wins and this file is updated.

## 1. Character

- **Paper, sheet, ink.** The ground is warm paper (`--background`). Working surfaces are lighter sheets (`--card`) raised by a soft shadow (`--shadow-card`), never outlined boxes.
- **One signal.** Terracotta (`--primary`) marks the current item, the active state and links. It is never a page or card fill.
- **The signature is the day ruler.** On Today, the day's records sit as clips on a 6 to 24 hour grid, one lane per kind (records, exercise, watched), with a terracotta "now" line. The tappable list sits underneath. The ruler is drawn from the same items as the list and is hidden from assistive tech.
- **Physical controls, used sparingly.** The record button is a sheet pill holding a small rubber cap in a bezel (`.rubber-pill`). The colour lives only in the cap.

## 2. Colour

Three themes, set by `data-theme` on `<html>` (`warm` is `:root`, plus `cool` and `dark`). All of them define the same shadcn HSL triplets, which Tailwind reads as `hsl(var(--x))`.

| Role | Token | Warm |
|------|-------|------|
| Paper (page) | `--background` | `32 51% 96%` |
| Sheet (cards, menus) | `--card`, `--popover` | `36 71% 98%` |
| Ink | `--foreground` | `15 36% 10%` |
| Muted text | `--muted-foreground` | `24 10% 38%` |
| Second neutral (sidebar, chips, wells) | `--muted`, `--secondary` | `31 38% 92%` |
| Rule | `--border` | `28 20% 84%` |
| Field edge (3:1 against the sheet) | `--input` | `26 10% 56%` |
| Signal | `--primary`, `--ring` | `13 62% 42%` |

Tonal pair (primary buttons, selected chips): `--tonal-bg` (the signal at 11%), `--tonal-bg-hover` (18%), `--tonal-text`. The test in `button-tokens.test.ts` holds tonal, success and danger text at 4.5:1 or better in every theme.

Material: `--shade-1/2/3` (shadows), `--sheet-hi` (the lit top edge), `--rubber`, `--rubber-hi`, `--rubber-lo` and `--bezel` (the cap), `--lane-exercise` and `--lane-watch` (ruler lanes; record modules keep their own colours), `--chart-*` and `--series-left/right` (charts), and `--bloom-1/2` (two faint fixed blooms behind the page).

Colours are written only as tokens. Module colours in `features/modules/**` are user record data, not UI colours.

## 3. Type

- **Latin:** Ranade 400 and 500, self-hosted (`src/app/fonts/`, ITF Free Font License) so the PWA keeps it offline. **Japanese:** the system's Japanese sans (Hiragino, Noto Sans JP, Yu Gothic UI). **Figures and timecodes:** Geist Mono (duration badges, the ruler, calendar days, timeline times).
- Headings: weight 600 (Ranade renders 500), tracking `-0.022em`, sentence case, one colour (ink). Page title 28px, section 18px, card title 15px.
- Body 15px with 1.55 line-height, labels 13px weight 500, meta 13px muted. Nothing under 11px.
- No uppercase or letter-spaced labels anywhere. Dates and section labels use sentence case in the body face.

## 4. Shape and depth

- Radius: `--radius-card` 18px (cards, dialogs, panels), `--radius-inner` 10px (fields, thumbnails, rows, menus), `--radius-clip` 6px (ruler clips, small thumbs), `--radius-pill` (buttons, chips, nav).
- Depth by shadow, not outline: `--shadow-card` for sheets, `--shadow-lift` for menus, dialogs, the drawer and the floating nav, `--shadow-pill` for sheet pills. Never a hairline border under a wide shadow.
- Scrims are a flat `--scrim`, with no backdrop blur.

## 5. Controls

- **Buttons** are 36px tall with 13px text (`h-9`). Primary uses the tonal fill (`variant="default"`). Secondary and outline are outline-only on a transparent fill, as pinned by `button.test.tsx`. Destructive uses a tonal red. Never a dark solid fill.
- **Record and choose actions** on a day use `.rubber-pill`: a 40px sheet pill, with the rubber cap on the record action.
- **Chips and segments** are outlined pills; the selected one takes the tonal fill.
- **Menus** open as drop-downs anchored to their trigger, never as bottom sheets.
- **Fields** are 40 to 44px with a `--input` edge and a 2px `--ring` focus outline.
- **Every control** has `:focus-visible` (a 2px ring), hover, a 1px press (`translateY(1px)`), and disabled at 50% opacity.

## 6. Video cards

YouTube-style: a 16:9 thumbnail with a mono duration badge, the recommendation slot as a small tonal tag, a 2-line title, a muted meta line, and a ⋮ menu instead of a "Watch" button. Hovering the thumbnail rings its frame; the image itself never moves.

## 7. Shell

- At `lg` and up, a left sidebar on the second neutral; the current page is a raised sheet row.
- Below `lg`, a solid sticky header (the brand, language and sync) and a floating pill nav with a 44px hit area per destination.
- The main column is `max-w-screen-sm` on phones and `max-w-screen-xl` on desktop.

## 8. Motion

State only: `--dur-micro` (120ms) and `--dur-short` (220ms) on `transform`, `opacity`, colour and shadow. Never `transition: all`, and never animated width, height, top or left. Every animation has a `prefers-reduced-motion` fallback (see `base.css`).

## 9. Copy still pinned by tests

These read as icons or joins that the design would drop, but tests pin them as product copy. Change them only together with their tests:

- `▶` and `✅` in the `timeline_*` strings (`timeline-section.test.tsx`)
- The ` · ` joins in video-card meta and the player position (`video-card.test.tsx`, `player-screen.test.tsx`, `exercise-detail-screen.test.tsx`)
- The 💮 hanamaru in the calendar and the celebration (`history-screen.test.tsx`, `feedback.test.tsx`)
- The bottom nav's solid `bg-primary` current page (`bottom-nav.test.tsx`); the approved mockup used the tonal fill
