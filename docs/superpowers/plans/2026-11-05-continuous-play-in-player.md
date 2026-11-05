# Continuous Play in the Player Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The video player screen (`/exercises?exerciseId=…`) gets a remembered "連続再生" mode. When it is on, the screen plays the list it was opened from back-to-back, with loop, ⏮/⏭, an up-next list, auto-check, and the screen kept awake.

**Architecture:**
- **Queue hand-off.** Library and Today publish the list they currently show to sessionStorage. The player screen reads it and plays it if it contains the opened exercise. Otherwise it plays that one exercise alone.
- **Player.** A `PlayerScreen` container in the detail loader owns `usePlaylist` and one `PlaylistPlayer`. It hands the player node and the current exercise to `ExerciseDetailScreen`, so the title, log buttons and description follow the video while the iframe stays mounted.
- **Undo v1.** The v1 inline-on-Today wiring is removed first.

**Tech Stack:** Next.js 15 (static export, `basePath: "/ExerLog"`), React 19, TypeScript, Vitest + Testing Library (jsdom), Dexie/fake-indexeddb. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-05-continuous-play-in-player-design.md`

## Global Constraints

- Work on branch `feat/my-list-continuous-play` (v1 commits stay in history; v1 never reached `main`).
- Mode OFF must behave exactly like today's player screen. That means the thumbnail with ▶, one video, and a start/end clip repeating its section. There are no ⏮/⏭, no up-next list and no position line.
- **Mode ON:**
  - Playback starts on open.
  - On ENDED, playback advances. Loop sends it back to the first video; without loop it stops after the last one.
  - Auto-check logs `"did"` only for a video that played to its end.
  - Nothing is logged for ⏭, an up-next tap, stopping, or leaving the screen.
  - Nothing is logged if the user already logged that same play by hand (any result).
- Logs go to the same day as manual logs: `logDate` (from `?date=`) or today.
- Every video that starts playing records `recordWatchEvent({ exerciseId })`. This replaces the detail screen's current `handleWatch` call on ▶.
- One YouTube player for the whole visit. Later videos are swapped in with `loadVideoById`; the player is never recreated.
- **Settings.** `continuous`, `loop` and `autoCheck` are remembered in localStorage key `exerlog-playlist-settings`. All three default to `false`. The existing cross-copy sync event stays.
- **Wake lock.** Hold a Screen Wake Lock while mode is ON and a video is loaded. Re-acquire it on `visibilitychange` to visible, release it otherwise, and do nothing where the API is missing.
- Playback keeps going and auto-check keeps working while the tab is hidden.
- **URL.** When the current video changes, `history.replaceState` the URL's `exerciseId`, keeping `date`. The back history does not grow.
- **Screen layout (option B), top to bottom:**
  1. A row with "← 戻る" on the left and a 連続再生 switch on the right.
  2. When ON, a small line with `"{name} · {n}/{total}"` and the 🔁 Loop / ✓ Auto check chips (`aria-pressed`).
  3. The video.
  4. When ON, large ⏮ ⏭ under the video.
  5. The existing title, meta, log buttons, my-list menu and description.
  6. When ON, "次に流れる" with up to 5 upcoming items plus "ほか {count} 本".
- **Styling.** Tonal light buttons about 36px; ⏮/⏭ may be larger (about 44px). No dark solid fills, no bottom sheets, and no nag text.
- **Strings.** Every new string goes in both `en.ts` and `ja.ts` (the table is in Task 5).
- **Tests.** `npx vitest run <path>`; full suite `npm test`. For the type check, `npx tsc --noEmit` must report 0 errors outside `*.test.ts(x)`; the test-file errors already exist. Afterwards run `git checkout -- tsconfig.tsbuildinfo`.

## Review Focus

1. **Off-mode clip.** A video with `start`/`end` played with mode OFF must repeat its section as it does today, not stop or advance. Pinned in Task 3: `"mode off: a bounded clip restarts itself on end"`.
2. **Mode switched off mid-run.** The current video finishes and does not advance. Pinned in Task 3: `"turning continuous off mid-video: an unbounded video stops at its end"`.
3. **Opened exercise missing from the stored queue.** This happens with a direct link or a stale session. The screen must play only that exercise. Pinned in Task 2: `resolvePlayQueue` returns `null`, and Task 5 tests a single-item run.
4. **Mode ON but the opened exercise isn't on YouTube.** Show the existing "watch video" link and don't auto-advance. Non-YouTube items elsewhere in the queue are skipped. Pinned in Task 5.
5. **Manual "partial" during a run.** It suppresses the auto log for that play only. The next play of the same video (loop) can auto-log again. Pinned in Task 3.

---

### Task 1: Remove the v1 Today-inline integration

**Files:**
- Delete: `src/features/playlist/components/playlist-controls.tsx`, `playlist-slot.tsx`, `playlist-stage.tsx`
- Modify: `src/features/today/components/today-screen.tsx` (drop `usePlaylist`, `PlaylistControls`, `PlaylistSlot`, `PlaylistStage`, `listRef`, `handleFinished`, the playing class, the scroll effect, `media`/`onActivate` props, `NO_EXERCISES`)
- Modify: `src/features/library/components/video-card.tsx`, `src/features/today/components/recommended-exercise-card.tsx` (remove `media`, `onActivate`)
- Modify: `src/app/globals.css` (remove `.playlist-controls*`, `.playlist-slot`, `.playlist-stage`, `.today-screen__card--playing`, and `position: relative` plus its comment from `.today-screen__recommendations`; keep `.playlist-player`, `.playlist-now-playing__buttons`)
- Modify: i18n `en.ts`/`ja.ts` (remove `playlist_controls_aria`, `playlist_start`, `playlist_stop`)
- Test: remove the `describe("continuous play")` block and the `fakeYouTube` mock from `src/features/today/today-screen.test.tsx`; remove the `onActivate`/`media` tests from `src/features/today/recommended-exercise-card.test.tsx`

**Interfaces:**
- Produces: Today and Library cards are plain links to the player screen again. `usePlaylist`, `PlaylistPlayer`, the reducer, and the settings store remain.

- [ ] **Step 1:** Make the removals listed above.
- [ ] **Step 2: Run** `npm test`. Expected: all pass.
- [ ] **Step 3: Run** `npx tsc --noEmit 2>&1 | grep error | grep -v "\.test\.tsx\?("`. Expected: no output. Then `git checkout -- tsconfig.tsbuildinfo`.
- [ ] **Step 4: Commit** `refactor(playlist): remove the Today-inline continuous play (replaced by player-screen mode)`.

### Task 2: Settings `continuous` + play-queue hand-off store

**Files:**
- Modify: `src/features/playlist/playlist-settings-store.ts`, its test
- Create: `src/features/playlist/play-queue-store.ts`, `src/features/playlist/play-queue-store.test.ts`

**Interfaces:**
- Produces:

```ts
// playlist-settings-store.ts
export type PlaylistSettings = { continuous: boolean; loop: boolean; autoCheck: boolean }; // all default false

// play-queue-store.ts
export const PLAY_QUEUE_STORAGE_KEY = "exerlog-play-queue";      // sessionStorage
export type PlayQueue = { name: string; exerciseIds: string[] };  // name is the already-translated label
export function writePlayQueue(queue: PlayQueue): void;           // swallow storage errors
export function readPlayQueue(): PlayQueue | null;                // invalid/missing → null
/** The stored queue if it contains `exerciseId`, else null (play that exercise alone). */
export function resolvePlayQueue(exerciseId: string): PlayQueue | null;
/** Publishes `queue` whenever its name or ids change; null publishes nothing. */
export function usePublishPlayQueue(queue: PlayQueue | null): void;
```

- [ ] **Step 1: Write failing tests:**
  - Settings: defaults are `{ continuous: false, loop: false, autoCheck: false }`. A stored `{"loop":true}` reads as `{ continuous: false, loop: true, autoCheck: false }`. Round-trip with `continuous: true`.
  - Queue: write/read round-trip. Invalid JSON gives `null`. `resolvePlayQueue("b")` with ids `["a","b"]` returns the queue. `resolvePlayQueue("z")` gives `null`. `renderHook(usePublishPlayQueue, …)` writes on mount and again when the ids change. With `null` it writes nothing.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist/playlist-settings-store.test.ts src/features/playlist/play-queue-store.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `usePublishPlayQueue`, key the effect on `name` plus `exerciseIds.join(",")` so re-renders with equal content don't rewrite.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(playlist): remember continuous mode and hand the visible list to the player`.

### Task 3: `usePlaylist` for the player screen

**Files:**
- Modify: `src/features/playlist/use-playlist.ts`, `src/features/playlist/use-playlist.test.tsx`

**Interfaces:**
- Consumes: `PlaylistSettings` with `continuous` (Task 2); `playlistReducer` (unchanged).
- Produces (changed signature; `listKey` removed because the queue is a snapshot):

```ts
export function usePlaylist(args: {
  exercises: ExerciseVideo[];                    // the queue, in order (single exercise when no queue)
  onFinished: (exercise: ExerciseVideo) => void; // auto-check log
}): UsePlaylist;
export type UsePlaylist = {
  items: PlaylistItem[]; current: (PlaylistItem & { playId: number }) | null; isPlaying: boolean;
  settings: PlaylistSettings;
  setContinuous(on: boolean): void; setLoop(on: boolean): void; setAutoCheck(on: boolean): void;
  start(exerciseId?: string): void; next(): void; previous(): void; stop(): void;
  handleEnded(playId: number): void;
  /** The user logged the current play by hand: auto-check skips this playId. */
  markManualLog(): void;
};
```

`handleEnded(playId)` rules. Ignore the call unless `playId` is current.
- **Continuous ON:** if `autoCheck` is on and the user did not log this playId by hand, call `onFinished`. Then dispatch `ended` (advance, loop or stop).
- **Continuous OFF:** if the current clip has `startSeconds` or `endSeconds`, dispatch `start` with the same index, which gives a new playId and repeats the section. Otherwise do nothing; the player stays on its end screen and `current` stays set. Never log.

- [ ] **Step 1: Update existing tests** to the new args: drop `listKey` and the "switching lists stops playback" test. Turn `setContinuous(true)` on wherever a test expects advancing or auto-check.
- [ ] **Step 2: Write failing tests:**
  - `"mode off: a bounded clip restarts itself on end"`: one item with URL `…?start=5&end=20`, mode off. Call `start()` and then `handleEnded(id)`. The same exercise is current with a new playId, and `onFinished` is not called.
  - `"turning continuous off mid-video: an unbounded video stops at its end"`: turn continuous on, call `start()`, turn continuous off, call `handleEnded`. The current exercise is still the first one, it did not advance, and nothing was logged.
  - `"a manual log during a play suppresses its auto log"`: continuous and auto-check on, `start()`, `markManualLog()`, `handleEnded`. No `onFinished`, and playback advanced.
  - `"manual log suppression is per play"`: one item, loop on. Mark a manual log, end, then end the next play. `onFinished` is called exactly once (for the second play).
  - `"setContinuous persists"`: localStorage contains `continuous: true`.
- [ ] **Step 3: Run** `npx vitest run src/features/playlist/use-playlist.test.tsx`. Expected: FAIL.
- [ ] **Step 4: Implement.** Keep manual-logged playIds in a ref `Set<number>`.
- [ ] **Step 5: Run** `npx vitest run src/features/playlist`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(playlist): continuous on/off, section repeat when off, manual log wins`.

### Task 4: Wake lock hook

**Files:**
- Create: `src/lib/wake-lock/use-wake-lock.ts`, `src/lib/wake-lock/use-wake-lock.test.tsx`

**Interfaces:**
- Produces: `export function useWakeLock(active: boolean): void`.

- [ ] **Step 1: Write failing tests**, with `navigator.wakeLock` stubbed as `{ request: vi.fn(async () => sentinel) }`, where `sentinel = { release: vi.fn(async () => {}) }`:
  - Active requests `"screen"` once.
  - Becoming inactive calls `release`.
  - Unmount releases the lock.
  - After `document.visibilityState` becomes `"visible"` and a `visibilitychange` event fires, it requests again while active.
  - With no `navigator.wakeLock`, nothing throws.
- [ ] **Step 2: Run** `npx vitest run src/lib/wake-lock`. Expected: FAIL.
- [ ] **Step 3: Implement.** A rejected `request` goes to `console.warn`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(wake-lock): keep the screen on while active`.

### Task 5: Player screen with continuous mode

**Files:**
- Create: `src/features/playlist/components/player-screen.tsx` (the container)
- Create: `src/features/playlist/components/continuous-bar.tsx` (switch, position line, chips)
- Create: `src/features/playlist/components/up-next.tsx`
- Modify: `src/features/library/components/exercise-detail-loader.tsx` (render `PlayerScreen` instead of `ExerciseDetailScreen`; move the switch into the back row through a `trailing` slot)
- Modify: `src/features/library/components/exercise-detail-screen.tsx` (new optional props; remove the internal iframe/▶ path and `handleWatch` when `media` is given)
- Modify: i18n `en.ts`/`ja.ts`; `src/app/globals.css`
- Test: `src/features/playlist/components/player-screen.test.tsx`; keep `src/features/library/components/exercise-detail-screen.test.tsx` green

**Interfaces:**
- Consumes: `resolvePlayQueue`, `PlayQueue` (Task 2); `usePlaylist` (Task 3); `useWakeLock` (Task 4); `PlaylistPlayer`; `getExerciseById`; `addExerciseLog`; `parseLogDate`/`toDayKey`.
- Produces:
  - `ExerciseDetailScreen` gets new optional props:
    - `media?: ReactNode`. When given, it is rendered in place of the thumbnail block.
    - `onLogged?: () => void`. Called after a successful manual log.
    - `logCountBump?: number`. When it changes, the screen re-reads its counts so auto logs show up.
  - `PlayerScreen({ exercise, logDate }: { exercise: ExerciseVideo; logDate: string | null })`. It loads the queue's exercises with `getExerciseById`, in queue order, skipping missing ones. With no queue it uses `[exercise]`.
  - The thumbnail ▶ (shown when mode is OFF and nothing is playing) calls `playlist.start(currentId)`.
  - When `settings.continuous` is on at load, it calls `playlist.start(exercise.id)` once the queue resolves.
  - It renders `PlaylistPlayer` while `playlist.current` is set and the current exercise is embeddable. Otherwise it shows the thumbnail and ▶, or the existing "watch video" link for non-YouTube.
  - `onFinished` logs `"did"` to `logDate ?? today` and bumps `logCountBump`. There is no `celebrate`. On error it shows `log_save_error` and keeps playing.
  - `useWakeLock(settings.continuous && playlist.isPlaying)`.
  - When `current` changes, it runs `history.replaceState` with the new `exerciseId`.

Strings (exact):

| key | en | ja |
|---|---|---|
| `playlist_mode` | Continuous play | 連続再生 |
| `playlist_position` | {name} · {index}/{total} | {name} · {index}/{total} |
| `playlist_up_next` | Up next | 次に流れる |
| `playlist_up_next_more` | {count} more | ほか {count} 本 |
| `playlist_single_name` | This video | この動画 |

(Keep `playlist_loop`, `playlist_auto_check`, `playlist_previous_aria`, `playlist_next_aria`. The queue name for a single exercise is `playlist_single_name`.)

- [ ] **Step 1: Write failing tests** in `player-screen.test.tsx`. Use fake-indexeddb with three YouTube exercises `a, b, c`, the fake YT module from the v1 tests (record options, `loadVideoById`, `destroy`), and a `writePlayQueue({ name: "Morning", exerciseIds: ["a","b","c"] })` helper:
  - Mode off (default): no switch-dependent UI. That means no ⏮/⏭, no "Up next" and no position line. The ▶ button is present and no player is created until it is clicked.
  - With mode on in storage, opening `b`:
    - The player is created immediately with `vid-b`.
    - `"Morning · 2/3"` is shown.
    - "Up next" lists `c` only.
    - The title shows B.
  - Mode on plus auto-check, opening `a`, then PLAYING followed by ENDED:
    - `loadVideoById({ videoId: "vid-b" })` is called and the player is constructed once.
    - The title becomes B.
    - The DB holds 1 log for `a` with `result: "did"`.
    - `window.location.search` contains `exerciseId=b`.
  - Mode on: a manual "Did" on `a`, then ENDED → the DB holds exactly 1 log for `a`.
  - Mode on, ⏭ → B plays and the DB holds 0 logs.
  - Tapping C in Up next → C plays.
  - Opening `z`, which is not in the queue, with mode on → the position line shows `"This video · 1/1"` and there is no Up next.
  - With mode on and the opened exercise not on YouTube, the "Watch video" link is shown and no player is created.
  - With `?date=2026-10-19` (rendered with `logDate="2026-10-19"`), an auto log is stored with `date: "2026-10-19"`.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist/components/player-screen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use the strings and layout from Global Constraints. The `ContinuousBar` switch uses the existing `Switch` UI component with `aria-label={t("playlist_mode")}`.
- [ ] **Step 4: Run** `npx vitest run src/features/playlist src/features/library` and the full `npm test`. Expected: PASS. Fix existing detail-screen tests only where the ▶ path now goes through `PlayerScreen`. Assert the same user-visible behavior: the ▶ click records a watch event and shows the player.
- [ ] **Step 5: Run** the type check (Global Constraints) and `npm run lint`. Expected: no new errors.
- [ ] **Step 6: Commit** `feat(player): continuous play mode on the video player screen`.

### Task 6: Publish the visible list from Library and Today

**Files:**
- Modify: `src/features/library/components/library-screen.tsx`, `src/features/today/components/today-screen.tsx`
- Test: `src/features/library/library-screen.test.tsx`, `src/features/today/today-screen.test.tsx`

**Interfaces:**
- Consumes: `usePublishPlayQueue`, `readPlayQueue` (Task 2).
- Library publishes `{ name: selectedSet?.name ?? t("library_set_all"), exerciseIds: filteredExercises.map(e => e.id) }`, i.e. the visible order after search, filters and sort.
- Today publishes, once hydrated and not empty:
  - with a set selected: `{ name: selectedSet.name, exerciseIds: selectedSetExercises ids }`
  - otherwise: `{ name: t("today_recommended_heading"), exerciseIds: recommendations ids }`
  - When nothing is shown, it publishes `null`.

- [ ] **Step 1: Write failing tests:**
  - Library: the "すべて" order matches the visible headings. Selecting a set publishes that set's name and ids. Choosing the "most-done" sort reorders the published ids.
  - Today: by default, the 3 recommended ids are published under "Recommended for today" in display order. Selecting set "Morning" publishes its ids.
- [ ] **Step 2: Run** `npx vitest run src/features/library/library-screen.test.tsx src/features/today/today-screen.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command plus `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(playlist): Library and Today hand their visible list to the player`.

### Task 7: Check it in the real app

- [ ] **Step 1:** Run `npm run dev` and use a throwaway origin (`http://127.0.0.1:<port>/ExerLog/`, separate storage) with the starter data and a test my-list. Never write test data into the user's `localhost` data.
- [ ] **Step 2: Mode off.** Open from Library. The screen looks and behaves as before, and the ▶ clip repeats its section.
- [ ] **Step 3: Mode on.** Check each of these:
  1. Opening a clip autoplays.
  2. Clips advance at their end time, and the same iframe is reused.
  3. Loop works.
  4. Auto-check logs once per finished clip.
  5. ⏭ does not log.
  6. A manual Did does not get doubled.
  7. The URL `exerciseId` follows the playing video.
  8. Back returns to Library.
  9. Opening from Today's recommendations plays exactly those 3.
- [ ] **Step 4: Phone width.** At 400px there is no horizontal scroll. Also check dark mode.
- [ ] **Step 5:** Fix anything found with a failing test first, then commit.
