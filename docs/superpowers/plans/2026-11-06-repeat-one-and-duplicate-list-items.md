# Repeat-one Button and Duplicate My-list Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A my-list can hold the same video several times (spaced apart), and the player gets a 🔂 "repeat this video" button.

**Architecture:** A list position is named by an **entry key**: the first occurrence of a video in a list keeps its plain exercise id, later ones get `"<id>#<n>"` (n = 2, 3, …). Every place that orders, shuffles, hands over, renders or plays a list works on entry keys instead of exercise ids. Because first occurrences are plain ids, orders and queues already stored in session/local storage stay valid. Repeat-one is per-video state in `usePlaylist`, not a stored setting.

**Tech Stack:** Next.js 15 static export, React 19, TypeScript, Vitest + Testing Library, Dexie (fake-indexeddb in tests), @dnd-kit, radix DropdownMenu.

**Spec:** `docs/superpowers/specs/2026-11-06-repeat-one-and-duplicate-list-items-design.md`

## Global Constraints

- Stored shape is unchanged: `ExerciseSet.exerciseIds: string[]` may now contain repeats. No migration, no sync change.
- Exercise ids never contain `#` (UUIDs / catalog slugs). An entry key is `id` or `` `${id}#${n}` `` with n ≥ 2. Logs, watch events, counts and `?exerciseId=` always use the plain exercise id.
- 「すべて」 and today's three recommendations never show a video twice (their entry key is the plain id).
- Copy (ja / en):
  - `playlist_repeat_one`: 「この動画をくり返す」 / "Repeat this video". This is the 🔂 button's aria-label.
  - `set_menu_add_again_aria`: 「{name} にもう1つ追加」 / "Add once more to {name}".
  - `set_entry_remove`: 「このリストから外す」 / "Remove from this list".
- Turning the 🔂 button off never stops or skips the current video.
- Repeat-one is never stored. It is reset to off whenever playback moves to a different entry.
- Continuous play off with a start/end clip: 🔂 starts **on** (today's auto-repeat, now visible). Continuous play on: the clip plays once and moves on unless 🔂 is pressed.
- Run `git checkout -- tsconfig.tsbuildinfo` after any `tsc`. About 210 pre-existing tsc errors exist, all in test files (vitest globals). Non-test files must stay at 0.

## Review Focus

1. **A missing video earlier in the raw set.** For example, a set `["gone","a","b","a"]` where `gone` was deleted from the library. Removing the card for the second `a` must remove raw index 3, not index 1. Entry keys are counted over the raw ids. → test in Task 2.
2. **Shuffle off restores the duplicate positions** in both the library and the player. For example, `a,b,a` shuffled and then un-shuffled is `a,b,a` again. → tests in Task 4 and Task 6.
3. **Opening the second card of a video starts the run at that position**, and a reload of the player keeps it there (`&entry=` in the URL). → test in Task 6.
4. **Repeat-one with 自動できた on:** every full pass logs once, and a pass logged by hand is not doubled. → test in Task 7.
5. **Old plain-id stores still work.** A `LibraryShuffle.order` or `PlayQueue.exerciseIds` with no `#` keys orders and plays as before. → covered because existing tests stay green unchanged (Tasks 4 and 6 must not edit existing assertions except where noted).

---

### Task 1: Entry keys and duplicate-aware set resolution

**Files:**
- Create: `src/features/exercise-sets/list-entries.ts`, `src/features/exercise-sets/list-entries.test.ts`
- Modify: `src/features/exercise-sets/resolve-set-exercises.ts` (+ its test), `src/features/exercise-sets/list-order.ts` (+ its test)

**Interfaces:**
- Produces:
  - `type ListEntry = ExerciseVideo & { entryKey: string }`
  - `toEntryKeys(ids: readonly string[]): string[]`
  - `exerciseIdOfEntry(entryKey: string): string`. It strips a trailing `#<digits>`.
  - `asEntries(exercises: readonly ExerciseVideo[]): ListEntry[]`. Here `entryKey = id`; it is used for すべて and recommendations.
  - `resolveSetExercises(set, exercises): ListEntry[]`. It keeps repeats, with keys from `toEntryKeys(set.exerciseIds)`, and skips ids missing from the library.
  - `applyOrder<T extends { id: string }>(items, orderKeys, keyOf?: (item: T) => string)`. `keyOf` defaults to `item => item.id`.

- [ ] **Step 1: Write the failing tests**

```ts
test("later occurrences get #n keys, first stays the plain id", () => {
  expect(toEntryKeys(["a", "b", "a", "a"])).toEqual(["a", "b", "a#2", "a#3"]);
  expect(exerciseIdOfEntry("a#3")).toBe("a");
  expect(exerciseIdOfEntry("a")).toBe("a");
});
test("a set keeps repeats in order; keys count raw ids even when one is missing", () => {
  const set = { ...baseSet, exerciseIds: ["gone", "a", "b", "a"] };
  expect(resolveSetExercises(set, [ex("a"), ex("b")]).map((e) => e.entryKey)).toEqual(["a", "b", "a#2"]);
});
test("applyOrder can order by entry key", () => {
  const items = asEntriesWithKeys(["a", "b", "a#2"]); // helper in the test
  expect(applyOrder(items, ["a#2", "a", "b"], (e) => e.entryKey).map((e) => e.entryKey)).toEqual(["a#2", "a", "b"]);
});
```

- [ ] **Step 2: Run** `npx vitest run src/features/exercise-sets`. Expected: FAIL (the module is missing, and resolve still de-dupes). Also delete or update the existing resolve test that asserted "repeated ids keep their first position". This is the spec change; ledger it.
- [ ] **Step 3: Implement** the functions above. `applyOrder` keeps its "unknown keys skipped, unlisted items appended" behaviour, now keyed by `keyOf`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(lists): entry keys so a my-list can hold a video more than once`

### Task 2: Repository: add once more, remove one entry

**Files:**
- Modify: `src/features/storage/exercise-sets.repository.ts` (+ its test)

**Interfaces:**
- Consumes: `toEntryKeys`.
- Produces:
  - `addExerciseToSet(setId: string, exerciseId: string): Promise<void>`. It always appends.
  - `removeSetEntry(setId: string, entryKey: string): Promise<void>`. It removes exactly that occurrence.
  - Both call `scheduleSync()` on change, and an unknown set is a no-op.
  - `setExerciseInSet` is unchanged: unchecking still removes every copy.

- [ ] **Step 1: Failing tests**

```ts
test("addExerciseToSet appends a repeat", async () => { /* ["a","b"] → ["a","b","a"] */ });
test("removeSetEntry removes only that occurrence, counting missing ids too", async () => {
  // raw ["gone","a","b","a"]; removeSetEntry(id, "a#2") → ["gone","a","b"]
});
test("unchecking removes every copy", async () => { /* ["a","b","a"] → setExerciseInSet(...,"a",false) → ["b"] */ });
```

- [ ] **Step 2: Run** `npx vitest run src/features/storage/exercise-sets`. Expected: FAIL (functions missing).
- [ ] **Step 3: Implement** both functions inside an `appDb.transaction`. `removeSetEntry` finds the index with `toEntryKeys(set.exerciseIds).indexOf(entryKey)` and splices it.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(lists): add a video to a my-list again, remove a single entry`

### Task 3: Card ⋮ menu: ＋ and 「このリストから外す」

**Files:**
- Modify: `src/features/exercise-sets/components/exercise-set-menu.tsx` (+ test), `src/features/i18n/messages/{ja,en}.ts`, `src/app/globals.css` (small style for the ＋ button)

**Interfaces:**
- Consumes: `addExerciseToSet`, `removeSetEntry`.
- Produces: new optional prop `entry?: { setId: string; entryKey: string }` on `ExerciseSetMenu`.
  - When present, the menu shows a `DropdownMenu.Item` with `set_entry_remove` that calls `removeSetEntry`, then `onChanged()`.
  - Each set row that already contains the exercise shows a ＋ button. Its aria-label is `set_menu_add_again_aria` with `{name}`. It calls `addExerciseToSet`, then `onChanged()`, and keeps the menu open.

- [ ] **Step 1: Failing tests** (render the menu, open it with the trigger):
  - "＋ appears only next to sets that contain the video". With sets `朝 ["a"]` and `夜 []`, find the button named 「朝 にもう1つ追加」; there is none for 夜.
  - "＋ appends a repeat and keeps the menu open". After clicking, the stored `朝` is `["a","a"]`, the menu is still open, and `onChanged` was called.
  - "remove item only with an entry, and removes that entry". With `entry={{ setId: 朝.id, entryKey: "a#2" }}` and stored `["a","b","a"]`, clicking 「このリストから外す」 leaves `["a","b"]`. Without `entry`, there is no such item.
- [ ] **Step 2: Run** `npx vitest run src/features/exercise-sets/components`. Expected: FAIL.
- [ ] **Step 3: Implement.** The ＋ is a small icon button (`Plus` 16px) at the right end of the `CheckboxItem` row. Stop propagation so the checkbox does not toggle. Add the three i18n keys from Global Constraints.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(lists): ＋ to add a video again and remove one card from a my-list`

### Task 4: Library works on entries

**Files:**
- Modify: `src/features/library/components/library-screen.tsx`, `src/features/library/components/reorder-list.tsx`, `src/features/library/components/library-screen.test.tsx` (and `reorder-list` test if present)

**Interfaces:**
- Consumes: Task 1 and Task 3.
- Produces:
  - Library cards link to `/exercises?exerciseId=<id>` plus `&entry=<encoded key>` **only when key ≠ id**.
  - The published `PlayQueue` arrays (`exerciseIds`, `unshuffledIds`, `listIds`) hold **entry keys**.
  - `LibraryShuffle.order` holds entry keys.
  - `ReorderList` props become `entries: ListEntry[]` and `onReorder(keys: string[])`.

Changes:
- `baseExercises` is `ListEntry[]`: `resolveSetExercises(...)` for a set, or `asEntries(applyOrder(exercises, libraryOrder))` for すべて.
- Every `applyOrder` over these entries passes `(e) => e.entryKey`.
- `shuffleIds` is fed entry keys.
- React `key` and the reorder draft use `entryKey`.
- `persistOrder` maps keys back with `exerciseIdOfEntry` before storing.
- A card gets `ExerciseSetMenu entry={{ setId, entryKey }}` only when a set is selected (reorder mode shows `ReorderList`, so the item never appears during reorder).

- [ ] **Step 1: Failing tests** in `library-screen.test.tsx`, with a set 朝 `["a","b","a"]` selected:
  - "a repeated video shows one card per entry": the card headings are `A, B, A`.
  - "the second card opens its own position": the second A's link href contains `entry=a%232`.
  - "the published queue lists entry keys": sessionStorage `exerciseIds` equals `["a","b","a#2"]`.
  - "reorder moves one copy and saves ids": drag (or keyboard-move) the second A to the top and save; the stored set is `["a","a","b"]`.
  - "shuffle then back to default restores a,b,a": choose シャッフル, then 標準; the headings are `A, B, A`.
  - "remove from this list removes that card": on the second A, open ⋮ and choose 「このリストから外す」; the headings are `A, B`.
- [ ] **Step 2: Run** `npx vitest run src/features/library`. Expected: the new tests FAIL; existing ones pass.
- [ ] **Step 3: Implement** the changes listed above.
- [ ] **Step 4: Run** `npx vitest run src/features/library`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(library): show and reorder a my-list's repeated videos as separate cards`

### Task 5: Today works on entries

**Files:**
- Modify: `src/features/today/use-today-data.ts`, `src/features/today/components/today-screen.tsx`, `src/features/today/components/recommended-exercise-card.tsx`, `src/features/today/today-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 and Task 3.
- Produces:
  - `selectedSetExercises: ListEntry[]`.
  - `RecommendedExerciseCard` gets an optional `entry` prop that it forwards to `ExerciseSetMenu`.

Changes:
- Cards are keyed by `entryKey`. Recommendations use `asEntries`.
- `watchHref` adds `&entry=` when key ≠ id.
- The published queue holds entry keys.
- Today counts and logs stay per exercise id.

- [ ] **Step 1: Failing tests** with set 朝 `["a","b","a"]` selected on Today:
  - Three cards `A, B, A`.
  - Tapping できた on the second A shows today's count 1 on **both** A cards.
  - The published queue is `["a","b","a#2"]`.
  - 「このリストから外す」 on the second A leaves `A, B`.
  - Recommendations show no remove item.
- [ ] **Step 2: Run** `npx vitest run src/features/today`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS. Also run `npx vitest run src/app/page.test.tsx` (Today is mounted there).
- [ ] **Step 5: Commit** `feat(today): a my-list's repeated videos show as separate cards`

### Task 6: Player plays entries

**Files:**
- Modify:
  - `src/features/library/components/exercise-detail-loader.tsx` (+ test)
  - `src/features/playlist/play-queue-store.ts` (+ test)
  - `src/features/playlist/use-playlist.ts` (+ test)
  - `src/features/playlist/components/player-screen.tsx` (+ test)
  - `src/features/playlist/components/up-next.tsx`

**Interfaces:**
- Consumes: Task 1, and the keys published by Tasks 4 and 5.
- Produces:
  - `PlayerScreen` props get `entryKey: string`. The loader reads `?entry=` after mount, the same way it reads `exerciseId`, and defaults to the exercise id.
  - `resolvePlayQueue(entryKey: string)`.
  - `usePlaylist({ entries: ListEntry[], onFinished })`, and `PlaylistItem = { entryKey; exercise; clip }`.
  - `start(entryKey?)`. `UpNext` takes `ListEntry[]` and `onSelect(entryKey)`.
  - The URL rewrite sets `exerciseId` to the plain id, and sets `entry` (or deletes it when key = id).

Changes:
- In `usePlaylist`, `playingIdRef` becomes the playing **entry key**, and seek-on-reorder matches by key.
- In `PlayerScreen`, `loadQueue` maps each key to `getExerciseById(exerciseIdOfEntry(key))` and builds `ListEntry`s.
- `order` and `unshuffledOrder`, the shuffle `first`, the `writeLibraryView` order, the position index and `upcoming` all use entry keys.
- `displayed` stays an `ExerciseVideo` (for the detail screen), and a new `displayedKey` tracks the entry.

- [ ] **Step 1: Failing tests** in `player-screen.test.tsx`, with a queue `["a","b","a#2"]`:
  - "opening the second copy starts there": render with `entryKey="a#2"`. Expect `Morning · 3/3` and the first player `videoId` to be `vid-a`.
  - "duplicates play in list order": open `a`, finish ×2. Expect `loadVideoById` called with `vid-b`, then `vid-a`, and `Morning · 3/3`.
  - "up next lists both copies": open `a`. Up next shows `B, A`.
  - "advancing to a#2 writes entry to the URL": `location.search` contains `entry=a%232`. On returning to `a` it has no `entry`.
  - "shuffle off restores a,b,a": open `a`, turn 🔀 on, then off. Up next is `B, A` again.

  In `exercise-detail-loader.test.tsx`: "?entry= reaches the player". Mount with `?exerciseId=a&entry=a%232` and a stored queue; expect `· 3/3`.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist src/features/library/components/exercise-detail-loader.test.tsx`. Expected: the new tests FAIL. Existing tests change only where they call `usePlaylist({ exercises })`, which becomes `entries: asEntries(...)`; ledger that.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(player): continuous play follows a my-list's repeated videos`

### Task 7: 🔂 Repeat-one button

**Files:**
- Modify:
  - `src/features/playlist/use-playlist.ts` (+ test)
  - `src/features/playlist/components/player-screen.tsx` (+ test)
  - `src/features/i18n/messages/{ja,en}.ts`
  - `src/app/globals.css` (`.player-screen__skip.is-on` state)

**Interfaces:**
- Consumes: Task 6's `usePlaylist`.
- Produces: `UsePlaylist.repeatOne: boolean` and `setRepeatOne(on: boolean): void`.

Behaviour (spec A):
- **On end, with 🔂 on:**
  1. If continuous is on and 自動できた is on and this playId was not logged by hand, call `onFinished`.
  2. Then `dispatch({ type: "start", index })` for the same index. That is a new playId, so the manual-log check runs per pass.
- **On end, with 🔂 off:** today's path, without the old "continuous off + bounded clip restarts" branch (that branch is deleted). Continuous off → stop. Continuous on → `ended`.
- **Reset:** `repeatOne` resets to false whenever the playing entry key changes to a different key (next, previous, up-next, ended → next). Restarting the same entry keeps it. Toggling continuous keeps it.
- **Initial value:** `PlayerScreen` sets `setRepeatOne(true)` once on open when `!readPlaylistSettings().continuous` and the opened video's clip has a start or end. With continuous on, it is never auto-set.
- **Button:** in `mediaFooter`, shown whenever the displayed video is YouTube-embeddable, with continuous on or off. It sits next to ⏮ ⏭ when those show and alone otherwise. It uses the `Repeat1` lucide icon, `aria-label={t("playlist_repeat_one")}`, `aria-pressed`, and the `is-on` class.

- [ ] **Step 1: Failing tests**
  - In `use-playlist.test.tsx`:
    - "repeat-one replays the same entry with a new playId".
    - "turning repeat-one off mid-video lets that video end normally". Continuous on → the next entry; continuous off → stopped.
    - "moving to another entry turns repeat-one off".
  - In `player-screen.test.tsx`:
    - "🔂 shows with the mode off". The button 「Repeat this video」 is present, `aria-pressed=false`.
    - "a start/end clip opens with 🔂 on when the mode is off". Use a draft with videoUrl `https://youtu.be/vid-k?start=10&end=20`.
    - "a clip in continuous play plays once and moves on". With the queue `[k, a]` and the mode on, finish → `vid-a`.
    - "repeat-one with auto check logs each pass, a manual log is not doubled". Mode on, autoCheck on, 🔂 on. Finish → 1 log. Tap 「Did it」, then finish → 2 logs total (not 3). Finish again → 3.
  - Update the existing off-mode clip test in `use-playlist.test.tsx` (if it asserts auto-restart from the hook alone) to go through `setRepeatOne(true)`; ledger it.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/features/playlist`, then `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(player): 🔂 repeat this video`
