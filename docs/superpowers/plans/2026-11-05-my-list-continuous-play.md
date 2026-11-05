# マイリスト連続再生 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Today screen, a selected my-list (`ExerciseSet`) can be played back-to-back inline, with loop, ⏮/⏭, ■ stop, and an optional auto-check that logs `"did"` for each video that plays to the end.

**Architecture:** A pure reducer (`playlist-queue.ts`) owns which video is playing; a `usePlaylist` hook wraps it with persisted settings, watch events and the "ended → log once" rule; a `PlaylistPlayer` component drives one YouTube IFrame API player and swaps videos with `loadVideoById`. The Today screen renders the controls above the list and swaps the playing card's thumbnail for the player.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest + Testing Library (jsdom), Dexie (fake-indexeddb in tests). No new dependencies — YouTube IFrame API types are declared locally.

**Spec:** `docs/superpowers/specs/2026-11-05-my-list-continuous-play-design.md`

## Global Constraints

- Today screen only, and only when a my-list is selected (not the "recommended" list, not the Library screen).
- Auto-check logs `result: "did"` only for a video that played to its end (or its `end` time). Never for ⏭, card-jump, ■ stop, list switch, or leaving the screen.
- Auto-check logs go through `useTodayData(date).logExercise` (logs to the displayed `date`). No `celebrate()` call for auto logs (my call per spec: must not cover the video). On failure show the existing `log_save_error` under that card and keep playing.
- A watch event (`recordWatchEvent({ exerciseId })`) is recorded each time a video starts playing in the playlist.
- Loop/auto-check settings persist per device in localStorage key `exerlog-playlist-settings`; defaults `{ loop: false, autoCheck: false }`.
- Non-YouTube videos are skipped by the queue; if none are embeddable, the "▶ 連続再生" control is not rendered.
- Card tap while idle → existing link to the detail screen (unchanged). Card tap while playing → jump to that video, no navigation.
- Buttons: tonal (light-tint) pill buttons ~36px, no dark solid fills; no bottom sheets; no nag messages.
- Every new string in both `src/features/i18n/messages/en.ts` and `ja.ts` (Task 6 lists them).
- Run tests with `npx vitest run <path>`; full suite `npm test`.

## Review Focus

1. A list with exactly one video and loop on — the same video must restart (not freeze). Pinned in Task 2 (`playId` changes even when `index` doesn't).
2. YouTube can emit ENDED more than once for one video — must log once. Pinned in Task 4.
3. ENDED arriving after ■ stop / list switch — must not log. Pinned in Task 4.
4. Auto-check turned off while a video is playing, then the video ends — must not log (setting read at end time). Pinned in Task 4.
5. The list shrinks while playing (video removed from the set on another tab/sync) so the index is past the end — playback stops instead of crashing. Pinned in Task 4.

---

### Task 1: YouTube clip parsing

**Files:**
- Modify: `src/lib/video/youtube.ts`
- Test: `src/lib/video/youtube.test.ts`

**Interfaces:**
- Produces: `export type YouTubeClip = { videoId: string; startSeconds?: number; endSeconds?: number }` and `export function getYouTubeClip(rawUrl: string): YouTubeClip | null`.

- [ ] **Step 1: Write failing tests** in `youtube.test.ts`:

```ts
test("getYouTubeClip reads id, start and end", () => {
  expect(getYouTubeClip("https://www.youtube.com/watch?v=abc123&start=30&end=90")).toEqual({ videoId: "abc123", startSeconds: 30, endSeconds: 90 });
});
test("getYouTubeClip omits missing or non-numeric bounds", () => {
  expect(getYouTubeClip("https://youtu.be/abc123")).toEqual({ videoId: "abc123" });
  expect(getYouTubeClip("https://youtu.be/abc123?start=x")).toEqual({ videoId: "abc123" });
});
test("getYouTubeClip returns null for non-YouTube or invalid URLs", () => {
  expect(getYouTubeClip("https://vimeo.com/1")).toBeNull();
  expect(getYouTubeClip("")).toBeNull();
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/video/youtube.test.ts` — Expected: FAIL (`getYouTubeClip` not exported).
- [ ] **Step 3: Implement `getYouTubeClip`** reusing `getYouTubeVideoId`; parse `start`/`end` with `Number`, keep only finite values ≥ 0. Leave `getYouTubeEmbedUrl` unchanged (the detail screen still uses its segment loop).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(video): parse YouTube clip id and bounds`.

### Task 2: Playlist queue reducer

**Files:**
- Create: `src/features/playlist/playlist-queue.ts`
- Test: `src/features/playlist/playlist-queue.test.ts`

**Interfaces:**
- Produces:

```ts
export type PlaylistState = { status: "idle" } | { status: "playing"; index: number; playId: number };
export type PlaylistAction =
  | { type: "start"; index: number }   // ▶ button (index 0) or card jump
  | { type: "next" }                   // ⏭
  | { type: "previous" }               // ⏮
  | { type: "ended" }                  // video reached its end
  | { type: "stop" };                  // ■, list switch
export type PlaylistContext = { length: number; loop: boolean };
export const IDLE: PlaylistState;
export function playlistReducer(state: PlaylistState, action: PlaylistAction, ctx: PlaylistContext): PlaylistState;
```

Rules: every transition into `playing` sets `playId = previous playId + 1` (start from idle uses 1). `next`/`ended` on the last index → index 0 if `loop`, else `IDLE`. `previous` on index 0 → stays 0 (restarts it). `start` with an index outside `0..length-1`, or `length === 0` → `IDLE`. Any action except `start` while idle → `IDLE`. `stop` → `IDLE`.

- [ ] **Step 1: Write failing tests** covering: start(0) → `{playing, index 0, playId 1}`; next moves 0→1 with playId+1; ended on last with loop → index 0; ended on last without loop → idle; **length 1 + loop: ended → index 0 with a new playId** (Review Focus 1); previous at 0 → index 0, new playId; start out of range → idle; next while idle → idle; stop → idle.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist/playlist-queue.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the reducer per the rules above.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(playlist): queue reducer for continuous play`.

### Task 3: YouTube IFrame API loader and PlaylistPlayer

**Files:**
- Create: `src/lib/video/youtube-iframe-api.ts`
- Create: `src/features/playlist/components/playlist-player.tsx`
- Test: `src/features/playlist/components/playlist-player.test.tsx`

**Interfaces:**
- Consumes: `YouTubeClip` (Task 1).
- Produces:

```ts
// youtube-iframe-api.ts — minimal local types, no @types/youtube
export type YTPlayer = { loadVideoById(args: { videoId: string; startSeconds?: number; endSeconds?: number }): void; destroy(): void };
export type YTNamespace = { Player: new (el: HTMLElement, opts: {
  videoId: string; playerVars?: Record<string, number | string>;
  events?: { onStateChange?: (e: { data: number }) => void };
}) => YTPlayer; PlayerState: { ENDED: number } };
export function loadYouTubeIframeApi(): Promise<YTNamespace>; // injects https://www.youtube.com/iframe_api once, resolves via window.onYouTubeIframeAPIReady (chain any existing handler); cached promise

// playlist-player.tsx
export function PlaylistPlayer(props: { clip: YouTubeClip; playId: number; title: string; onEnded: () => void }): JSX.Element;
```

Behavior: on mount, await the loader and create **one** `Player` in a div, with `videoId`, `playerVars: { autoplay: 1, playsinline: 1, start?, end? }`. When `playId` changes after creation, call `player.loadVideoById({ videoId, startSeconds, endSeconds })` on the same player (never recreate — mobile autoplay). `onStateChange` with `data === PlayerState.ENDED` → latest `onEnded` (keep it in a ref). Destroy on unmount. Wrapper div gets `aria-label={title}` and class `playlist-player` (16:9).

- [ ] **Step 1: Write failing tests** with `vi.mock("@/lib/video/youtube-iframe-api")` returning a fake `YT` whose `Player` constructor records options and returns `{ loadVideoById: vi.fn(), destroy: vi.fn() }`:
  - creates exactly one player with `videoId` and `playerVars.autoplay === 1`;
  - rerender with a new `playId` + clip → `loadVideoById` called with the new `{ videoId, startSeconds, endSeconds }`, constructor still called once;
  - invoking the recorded `onStateChange({ data: 0 })` calls `onEnded`; `{ data: 1 }` does not;
  - unmount calls `destroy`.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist/components/playlist-player.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the loader and component.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(playlist): single YouTube player that swaps videos in place`.

### Task 4: usePlaylist hook (settings, watch events, log-once)

**Files:**
- Create: `src/features/playlist/playlist-settings-store.ts`
- Create: `src/features/playlist/use-playlist.ts`
- Test: `src/features/playlist/playlist-settings-store.test.ts`, `src/features/playlist/use-playlist.test.tsx`

**Interfaces:**
- Consumes: `playlistReducer`, `PlaylistState` (Task 2); `getYouTubeClip`, `YouTubeClip` (Task 1); `recordWatchEvent` from `@/features/storage/watch-events.repository`.
- Produces:

```ts
// playlist-settings-store.ts
export const PLAYLIST_SETTINGS_STORAGE_KEY = "exerlog-playlist-settings";
export type PlaylistSettings = { loop: boolean; autoCheck: boolean };
export function readPlaylistSettings(): PlaylistSettings;            // defaults { loop: false, autoCheck: false }; bad JSON / throw → defaults
export function writePlaylistSettings(settings: PlaylistSettings): void; // swallow storage errors

// use-playlist.ts
export type PlaylistItem = { exercise: ExerciseVideo; clip: YouTubeClip };
export type UsePlaylist = {
  items: PlaylistItem[];                 // embeddable exercises only, in list order
  current: (PlaylistItem & { playId: number }) | null;
  isPlaying: boolean;
  settings: PlaylistSettings;
  setLoop(on: boolean): void;
  setAutoCheck(on: boolean): void;
  start(exerciseId?: string): void;      // no id → first item; unknown id → no-op
  next(): void; previous(): void; stop(): void;
  handleEnded(): void;                   // pass to PlaylistPlayer.onEnded
};
export function usePlaylist(args: {
  exercises: ExerciseVideo[];
  listKey: string | null;                // selected set id; a change stops playback
  onFinished: (exercise: ExerciseVideo) => void; // called once per playId when it ended AND autoCheck is on at that moment
}): UsePlaylist;
```

Rules: settings load on mount via `readPlaylistSettings` (state starts at defaults to avoid hydration mismatch, then effect), and every setter writes through. `recordWatchEvent` once per new `playId` (errors → `console.error`). `handleEnded`: ignore if idle or this `playId` was already finished; otherwise call `onFinished` if `settings.autoCheck` (latest value, via ref) and dispatch `ended`. If the current index is ≥ `items.length` after `exercises` changes → stop. `listKey` change → stop.

- [ ] **Step 1: Write failing store tests**: defaults when empty; round-trip write/read; invalid JSON → defaults.
- [ ] **Step 2: Write failing hook tests** (`renderHook`, `vi.mock` the watch-events repository):
  - non-YouTube exercises are excluded from `items`;
  - `start()` plays the first item and records one watch event; `next()` records another;
  - `start("b")` jumps to `b`;
  - autoCheck on: `handleEnded()` calls `onFinished(exercise)` once and moves on;
  - **calling `handleEnded()` twice for the same playId calls `onFinished` once** (Review Focus 2);
  - **`stop()` then `handleEnded()` → no `onFinished`** (Review Focus 3);
  - **`setAutoCheck(false)` while playing, then `handleEnded()` → no `onFinished`** (Review Focus 4);
  - `next()` (skip) never calls `onFinished`;
  - **rerender with fewer `exercises` so the current index is gone → `isPlaying` false** (Review Focus 5);
  - rerender with a different `listKey` → `isPlaying` false;
  - `setLoop(true)` persists to `exerlog-playlist-settings`.
- [ ] **Step 3: Run** `npx vitest run src/features/playlist` — Expected: FAIL.
- [ ] **Step 4: Implement** store and hook.
- [ ] **Step 5: Run** — Expected: PASS.
- [ ] **Step 6: Commit** `feat(playlist): usePlaylist with persisted loop/auto-check and log-once`.

### Task 5: Cards can host a player and intercept taps

**Files:**
- Modify: `src/features/library/components/video-card.tsx`
- Modify: `src/features/today/components/recommended-exercise-card.tsx`
- Test: `src/features/today/recommended-exercise-card.test.tsx`

**Interfaces:**
- Produces (new optional props, existing callers unaffected):
  - `VideoCardProps.media?: ReactNode` — rendered in place of the thumbnail link when present.
  - `VideoCardProps.onActivate?: () => void` — when present, clicks on the thumbnail and title links call `preventDefault()` and `onActivate()` (links keep their `href` so they stay accessible).
  - `RecommendedExerciseCard` gains the same two props, passed through to `VideoCard`.

- [ ] **Step 1: Write failing tests**: with `onActivate`, clicking the title link calls it and does not navigate (`defaultPrevented`); without it the link behaves as before; with `media`, the media node renders and the thumbnail `img` does not.
- [ ] **Step 2: Run** `npx vitest run src/features/today/recommended-exercise-card.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the props.
- [ ] **Step 4: Run** it plus `npx vitest run src/features/library` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(cards): optional inline media and tap override on video cards`.

### Task 6: Today screen wiring, controls, strings, styles

**Files:**
- Create: `src/features/playlist/components/playlist-controls.tsx`
- Create: `src/features/playlist/components/playlist-now-playing.tsx`
- Modify: `src/features/today/components/today-screen.tsx`
- Modify: `src/features/i18n/messages/en.ts`, `src/features/i18n/messages/ja.ts`
- Modify: `src/app/globals.css`
- Test: `src/features/today/today-screen.test.tsx`

**Interfaces:**
- Consumes: `usePlaylist`, `UsePlaylist` (Task 4); `PlaylistPlayer` (Task 3); `RecommendedExerciseCard` `media` / `onActivate` (Task 5); `logExercise` from `useTodayData`.
- Produces:
  - `PlaylistControls({ playlist }: { playlist: UsePlaylist })` — a `role="group"` with `aria-label={t("playlist_controls_aria")}`: one button toggling between `playlist_start` and `playlist_stop`, plus two toggle buttons (`aria-pressed`) for `playlist_loop` and `playlist_auto_check`. Tonal pill buttons, chip-style toggles as in the chosen mockup C.
  - `PlaylistNowPlaying({ playlist, title }: { playlist: UsePlaylist; title: string })` — `PlaylistPlayer` for `playlist.current` plus ⏮ / ⏭ buttons (`aria-label` `playlist_previous_aria` / `playlist_next_aria`, lucide `SkipBack` / `SkipForward`, ~36px tonal round).

Strings (exact):

| key | en | ja |
|---|---|---|
| `playlist_controls_aria` | Play all | 連続再生 |
| `playlist_start` | ▶ Play all | ▶ 連続再生 |
| `playlist_stop` | ■ Stop | ■ 停止 |
| `playlist_loop` | Loop | ループ |
| `playlist_auto_check` | Auto check | 自動チェック |
| `playlist_previous_aria` | Previous video | 前の動画 |
| `playlist_next_aria` | Next video | 次の動画 |

Wiring in `TodayScreen`: call `usePlaylist({ exercises: selectedSet ? selectedSetExercises : [], listKey: selectedSet?.id ?? null, onFinished })` where `onFinished` runs `logExercise(exercise, "did")`, on error sets `logErrorExerciseId` (no `celebrate`). Render `PlaylistControls` under the `SetSwitcher` only when `selectedSet` and `playlist.items.length > 0`. For each card: if `playlist.current?.exercise.id === exercise.id` pass `media={<PlaylistNowPlaying …/>}` and add class `today-screen__card--playing` (spans full row in the grid); while `playlist.isPlaying` pass `onActivate={() => playlist.start(exercise.id)}`; otherwise neither. Scroll the playing card into view (`scrollIntoView({ block: "nearest" })`, guarded for jsdom) when `playId` changes.

- [ ] **Step 1: Write failing tests** in `today-screen.test.tsx` (mock `@/lib/video/youtube-iframe-api` with the fake from Task 3; give the set's exercises YouTube `videoUrl`s):
  - with a set selected, "▶ Play all" shows; with "recommended" selected it does not; with a set of only non-YouTube videos it does not;
  - clicking it renders the player in the first card and the button becomes "■ Stop";
  - auto-check on + fake ENDED → the first card's today count becomes 1 and the second card holds the player;
  - auto-check off + ENDED → count stays 0;
  - while playing, clicking the third card's title jumps the player there (no navigation); while idle the title link still points at `/exercises?exerciseId=…`;
  - "■ Stop" removes the player and logs nothing.
- [ ] **Step 2: Run** `npx vitest run src/features/today/today-screen.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** components, wiring, strings, and CSS (`.playlist-player` 16:9 rounded like `.video-card__thumbnail`; `.today-screen__card--playing { grid-column: 1 / -1 }`; controls row wraps on phone width).
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit` and `npm run lint` — Expected: all pass.
- [ ] **Step 5: Commit** `feat(today): continuous play, loop and auto-check for my-lists`.

### Task 7: Check it in the real app

- [ ] **Step 1:** `npm run dev`, open Today, select a my-list with ≥2 YouTube videos (one with `start`/`end`). Verify: ▶ plays inline; it advances on its own; the `end`-bounded video advances at its end time (no segment loop); ⏮/⏭ work; loop on returns to the first; auto-check on adds one log per finished video; ■ stop logs nothing; settings survive a reload. Also check at phone width (no horizontal scroll) and in dark mode.
- [ ] **Step 2:** If `end`-bounded videos do not fire ENDED with `loadVideoById({ endSeconds })`, fix in `PlaylistPlayer` (e.g. treat a `PAUSED` at ≥ `endSeconds - 0.5` via `getCurrentTime()` as ended), add a test for it, and commit `fix(playlist): advance end-bounded clips`.
