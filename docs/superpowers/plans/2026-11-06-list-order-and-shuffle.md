# List Order and Shuffle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user drag-reorder a set or the whole library in edit mode, and shuffle the shown list from the library's sort menu or from a player chip, with the two kept in step, without ever overwriting the saved order.

**Architecture:** One pure ordering helper (`applyOrder` / `shuffleIds`) serves the saved "すべて" order, set order, and shuffle order alike. The "すべて" order is a new synced Dexie table `listOrders` (one record, id `"all"`), sets keep using `ExerciseSet.exerciseIds`. Library view state (selected set, sort, shuffle order) moves into a sessionStorage store that the player also writes, and the play-queue handoff gains `source`, `shuffled` and `unshuffledIds` so the player knows where the list came from and how to un-shuffle.

**Tech Stack:** Next.js 15 / React 19, Dexie 4 (IndexedDB), `@dnd-kit/core` + `@dnd-kit/sortable` (already dependencies), Vitest + Testing Library + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-06-list-order-and-shuffle-design.md`

## Global Constraints

- Saved order (set `exerciseIds`, library order) is written **only** by the reorder UI. Shuffle, sort menu, filters, and player never write it.
- Reordering (⇅) is available only when sort is the default (`""`), the search is empty, and no filter is active.
- Shuffle order stays fixed until the user picks シャッフル again (from another option) or toggles it in the player.
- Shuffle is not a device setting: never stored in `PlaylistSettings` / localStorage.
- Library view memory is session-scoped (sessionStorage). Search and the four filters are **not** remembered.
- Buttons: tonal, ~36px, round, no dark solid fills. Menus: anchored drop-downs, no bottom sheets.
- Copy (ja / en): `library_sort_shuffle` "シャッフル" / "Shuffle"; `library_reorder` "⇅ 並び替え" / "⇅ Reorder"; `library_reorder_done` "完了" / "Done"; `library_reorder_handle_aria` "{title}を移動" / "Move {title}"; `playlist_shuffle` "シャッフル" / "Shuffle"; `library_sort_default` changes from "登録順" to "標準" (en: "Default"), since after reordering it is no longer registration order.

## Review Focus

1. A video id in a saved or shuffle order that no longer exists → silently skipped (Task 1 test).
2. A video added while a saved order or shuffle is active → shown at the end, not missing (Task 1 test).
3. Switching set while sort is シャッフル → that set is shuffled afresh; never an empty or wrong list (Task 4 test).
4. Player shuffle toggled before anything plays, or on a one-video queue → no crash; displayed video stays first (Task 7 test).
5. Corrupt or missing sessionStorage view → library falls back to すべて / 標準 (Task 3 test).

---

### Task 1: Ordering helpers

**Files:**
- Create: `src/features/exercise-sets/list-order.ts`
- Test: `src/features/exercise-sets/list-order.test.ts`

**Interfaces:**
- Produces:
  - `applyOrder<T extends { id: string }>(items: readonly T[], orderIds: readonly string[]): T[]` — items whose id is in `orderIds` first, in that order (first occurrence wins, unknown ids skipped); remaining items after, in their input order.
  - `shuffleIds(ids: readonly string[], options?: { first?: string; random?: () => number }): string[]` — Fisher–Yates over all ids; if `first` is in `ids`, it is moved to index 0 and the rest shuffled. Default `random` is `Math.random`.

- [ ] **Step 1: Write the failing tests**

```ts
const v = (id: string) => ({ id });
test("applyOrder puts ordered ids first, skips unknown ids, appends the rest", () => {
  expect(applyOrder([v("a"), v("b"), v("c"), v("d")], ["c", "x", "a", "c"]).map((i) => i.id)).toEqual(["c", "a", "b", "d"]);
});
test("applyOrder with an empty order keeps input order", () => {
  expect(applyOrder([v("b"), v("a")], []).map((i) => i.id)).toEqual(["b", "a"]);
});
test("shuffleIds is a permutation and honours first", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const out = shuffleIds(ids, { first: "c", random: () => 0.3 });
  expect(out[0]).toBe("c");
  expect([...out].sort()).toEqual(ids);
});
test("shuffleIds ignores a first id that is not in the list", () => {
  expect([...shuffleIds(["a", "b"], { first: "z" })].sort()).toEqual(["a", "b"]);
});
```

- [ ] **Step 2: Run** `npx vitest run src/features/exercise-sets/list-order.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement both functions** in `list-order.ts`.
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): ordering and shuffle helpers`

---

### Task 2: Saved order storage and sync

**Files:**
- Modify: `src/lib/types.ts` (add `ListOrder`)
- Modify: `src/features/storage/app-db.ts` (table + `this.version(16)`)
- Create: `src/features/storage/list-orders.repository.ts`
- Modify: `src/features/storage/exercise-sets.repository.ts` (add `reorderExerciseSet`)
- Modify: `src/features/sync/sync-config.ts` (`listOrdersConfig`, add `appDb.listOrders` to `syncedDbTables`, add config to `tableSyncConfigs` before `tombstonesConfig`)
- Test: `src/features/storage/list-orders.repository.test.ts`, `src/features/sync/list-orders-config.test.ts`, extend existing exercise-sets repository test (or create `src/features/storage/exercise-sets.repository.test.ts` if absent)

**Interfaces:**
- Produces:
  - `type ListOrder = { id: string; exerciseIds: string[]; updatedAt: string }` in `src/lib/types.ts`.
  - `appDb.listOrders: Table<ListOrder, string>`; v16 stores = v15 stores + `listOrders: "id"`.
  - `LIBRARY_ORDER_ID = "all"`; `getLibraryOrder(): Promise<string[]>` (`[]` when no record); `saveLibraryOrder(exerciseIds: string[]): Promise<void>` (put with `updatedAt: localIsoNow()`, then `scheduleSync()`).
  - `reorderExerciseSet(setId: string, exerciseIds: string[]): Promise<void>` — replaces `exerciseIds`, stamps `updatedAt`, `scheduleSync()`; unknown set id is a silent no-op.
  - Sync tab `"ListOrders"`, `keyColumn: "id"`, `updatedAtKey: "updatedAt"`, `deletable: false`, headers `["id", "exerciseIds", "updatedAt"]`, `exerciseIds` serialised as JSON (reuse `parseExerciseIds`).

- [ ] **Step 1: Write failing tests**
  - `getLibraryOrder` returns `[]` on an empty table; after `saveLibraryOrder(["b","a"])` returns `["b","a"]`; a second save overwrites.
  - `reorderExerciseSet(set.id, ["b","a"])` → `listExerciseSets()` shows `["b","a"]` and a newer `updatedAt`; `reorderExerciseSet("missing", [])` resolves.
  - `ListOrders` config: `fromRow(toRow(record))` round-trips; `fromRow` with `""` or `"not json"` in `exerciseIds` gives `[]`.
- [ ] **Step 2: Run** `npx vitest run src/features/storage src/features/sync` — Expected: the new tests FAIL.
- [ ] **Step 3: Implement** type, schema version, repository functions, sync config.
- [ ] **Step 4: Run** the same command — Expected: PASS (existing sync-engine tests still green).
- [ ] **Step 5: Commit** `feat(library): store and sync the saved library order`

---

### Task 3: Library view session store and queue handoff fields

**Files:**
- Create: `src/features/library/library-view-store.ts`
- Test: `src/features/library/library-view-store.test.ts`
- Modify: `src/features/playlist/play-queue-store.ts` (+ its test)

**Interfaces:**
- Produces:
  - `type LibrarySort = "" | "most-watched" | "most-done" | "shuffle"`
  - `type LibraryShuffle = { listKey: string; order: string[]; previousSort: Exclude<LibrarySort, "shuffle"> }` — `listKey` is the set id, `""` for すべて.
  - `type LibraryView = { set: string; sort: LibrarySort; shuffle: LibraryShuffle | null }`
  - `LIBRARY_VIEW_STORAGE_KEY = "exerlog-library-view"`; `DEFAULT_LIBRARY_VIEW: LibraryView = { set: "", sort: "", shuffle: null }`
  - `readLibraryView(): LibraryView` — sessionStorage; any parse/shape error, or `sort === "shuffle"` with `shuffle === null`, returns `DEFAULT_LIBRARY_VIEW`. `writeLibraryView(view: LibraryView): void` — swallows storage errors.
  - `PlayQueue` becomes `{ name: string; exerciseIds: string[]; source?: "library"; shuffled?: boolean; unshuffledIds?: string[] }`. `readPlayQueue` keeps accepting the old shape (fields optional); drops `unshuffledIds` if not a string array. `usePublishPlayQueue` must republish when any field changes.

- [ ] **Step 1: Write failing tests**
  - write → read round-trips a shuffled view.
  - junk JSON, `{ sort: "shuffle", shuffle: null }`, and an unknown sort value each read as `DEFAULT_LIBRARY_VIEW`.
  - `writePlayQueue({ name: "x", exerciseIds: ["b","a"], source: "library", shuffled: true, unshuffledIds: ["a","b"] })` → `readPlayQueue()` returns it unchanged; the old `{ name, exerciseIds }` shape still reads.
- [ ] **Step 2: Run** `npx vitest run src/features/library/library-view-store.test.ts src/features/playlist/play-queue-store.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): session view store and richer play queue`

---

### Task 4: Library uses saved order, remembers its view, and offers シャッフル

**Files:**
- Modify: `src/features/library/components/library-screen.tsx`
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts` (`library_sort_shuffle`, `library_sort_default` copy change)
- Test: `src/features/library/library-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 `applyOrder`, `shuffleIds`; Task 2 `getLibraryOrder`; Task 3 `readLibraryView`, `writeLibraryView`, `LibraryView`, extended `PlayQueue`.

Behaviour to implement:
- すべて base list = `applyOrder(exercises, libraryOrder)` (load `getLibraryOrder()` alongside `listAllExercises()`); set base list unchanged (`resolveSetExercises`).
- On mount, `set` and `sort` come from `readLibraryView()`; every change of set/sort/shuffle is written back with `writeLibraryView`. If the stored set id no longer exists once sets load, fall back to `""`.
- Picking シャッフル: `shuffle = { listKey: filters.set, order: shuffleIds(baseIds), previousSort: <the sort before> }`. Picking any other sort clears `shuffle`.
- While sort is `"shuffle"`, the list is `applyOrder(filteredByFilters, shuffle.order)`. If `shuffle.listKey !== filters.set` (set switched), create a new shuffle for the new base list (keeping `previousSort`) and write it.
- Published queue: `source: "library"`; `shuffled: sort === "shuffle"`; when shuffled, `unshuffledIds` = the filtered list under `previousSort` (what the user saw before shuffling).

- [ ] **Step 1: Write failing tests** (in the existing `describe` that reads `readPlayQueue()`, plus top-level ones):
  - with `saveLibraryOrder([<last catalog id>, <first catalog id>])`, the first two articles are those two, the rest follow in catalog order.
  - choosing シャッフル (stub `Math.random` with `vi.spyOn(Math, "random").mockReturnValue(0.1)`) publishes `shuffled: true`, `source: "library"`, `exerciseIds` a permutation of all ids, and `unshuffledIds` equal to the 標準 order; DB order (`getLibraryOrder()`) stays `[]`.
  - unmount and re-render `LibraryScreen` → the sort select still shows シャッフル and the article order is identical.
  - with sort シャッフル, selecting a set shows exactly that set's videos (permuted) and publishes `shuffled: true`.
  - choosing 標準 again restores the saved order and publishes `shuffled: false`.
  - remembered `set` pointing to a deleted set → shows すべて.
  - in `beforeEach`: clear `appDb.listOrders` and `sessionStorage`.
- [ ] **Step 2: Run** `npx vitest run src/features/library` — Expected: new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/features/library src/features/today` — Expected: PASS (Today also publishes queues; it must keep working with no `source`).
- [ ] **Step 5: Commit** `feat(library): saved order, remembered view and shuffle sort`

---

### Task 5: Reorder mode (⇅ 並び替え)

**Files:**
- Create: `src/features/library/components/reorder-list.tsx`
- Modify: `src/features/library/components/library-screen.tsx` (button in `.library-screen__edit-actions`, swap grid for `ReorderList` while reordering)
- Modify: `src/app/globals.css` (`.reorder-list*` rows)
- Modify: i18n (`library_reorder`, `library_reorder_done`, `library_reorder_handle_aria`)
- Test: `src/features/library/library-edit-mode.test.tsx`

**Interfaces:**
- Consumes: Task 2 `saveLibraryOrder`, `reorderExerciseSet`; Task 1 `applyOrder` (via Task 4's base list).
- Produces: `ReorderList({ exercises, onReorder, onDone }: { exercises: ExerciseVideo[]; onReorder(ids: string[]): void; onDone(): void })` — compact rows (small thumbnail via `resolveExerciseThumbnailUrl`, title, ≡ handle button labelled `library_reorder_handle_aria`). `DndContext` with `PointerSensor` (drag starts only from the handle; use `useSortable` listeners on the handle, `touch-action: none` on the handle only) and `KeyboardSensor` with `sortableKeyboardCoordinates`. After each drop, calls `onReorder` with the full new id order (`arrayMove`). A 完了 button calls `onDone`.

Behaviour: the ⇅ button shows in edit mode and is disabled unless sort is `""`, search is empty and no filter is active. Each drop saves immediately — `reorderExerciseSet(set.id, ids)` for a set, `saveLibraryOrder(ids)` for すべて — then reloads the list. 完了 returns to cards. Leaving edit mode also leaves reorder mode.

- [ ] **Step 1: Write failing tests**
  - edit mode → ⇅ 並び替え → rows appear (no `article` cards); focus the handle of the 1st row, `user.keyboard("[Space]")`, `"{ArrowDown}"`, `"[Space]"` → `getLibraryOrder()` resolves to the original order with the first two swapped; 完了 → cards are back in the new order.
  - same flow with a set selected → `listExerciseSets()` shows the set's new order; `getLibraryOrder()` stays `[]`.
  - ⇅ is disabled with sort よく見る順, with a search term, and with a filter set.
- [ ] **Step 2: Run** `npx vitest run src/features/library/library-edit-mode.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(library): drag to reorder a set or the whole library`

---

### Task 6: Playlist keeps the current video when the queue is reordered

**Files:**
- Modify: `src/features/playlist/playlist-queue.ts` (new action), `src/features/playlist/use-playlist.ts`
- Test: `src/features/playlist/playlist-queue.test.ts`, `src/features/playlist/use-playlist.test.tsx`

**Interfaces:**
- Produces: `PlaylistAction` gains `{ type: "seek"; index: number }` — while playing, moves `index` **without** changing `playId` (so the player does not reload); ignored when idle or out of range. `usePlaylist` keeps the playing exercise: when `items` change and the item at `state.index` is a different exercise, it dispatches `seek` to that exercise's new index (or `stop` if it is gone — existing behaviour).

- [ ] **Step 1: Write failing tests**
  - reducer: `seek` keeps `playId`, sets `index`; idle state unchanged.
  - hook: start at `b` of `[a,b,c]`, rerender with `[c,b,a]` → `current.exercise.id === "b"`, same `playId`; `next()` → `a`.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(player): keep the playing video when the queue is reordered`

---

### Task 7: Player shuffle chip, linked to the library

**Files:**
- Modify: `src/features/playlist/components/player-screen.tsx`, `src/features/playlist/components/continuous-bar.tsx`
- Modify: i18n (`playlist_shuffle`)
- Test: `src/features/playlist/components/player-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 `shuffleIds`, `applyOrder`; Task 3 `readLibraryView`, `writeLibraryView`, extended `PlayQueue`; Task 6 reorder-safe `usePlaylist`.
- Produces: `ContinuousStatus` gains props `shuffled: boolean; onShuffleChange(on: boolean): void`, rendering a third chip `🔀 {playlist_shuffle}` with `aria-pressed={shuffled}` (same `continuous-status__chip` styling).

Behaviour in `PlayerScreen`:
- `loadQueue` also keeps `source`, `shuffled`, `unshuffledIds`. State: `shuffled` (initial = `queue.shuffled === true`) and the ordered exercise list passed to `usePlaylist`.
- Turn on: `ids = shuffleIds(currentIds, { first: current?.exercise.id ?? displayed.id })`; reorder the queue to `ids`; remember the pre-shuffle order (the current order) for turning off. If `source === "library"`: `const view = readLibraryView(); writeLibraryView({ ...view, sort: "shuffle", shuffle: { listKey: view.set, order: ids, previousSort: view.sort === "shuffle" ? view.shuffle!.previousSort : view.sort } })`.
- Turn off: reorder the queue to the pre-shuffle order (`unshuffledIds` from the queue when it arrived shuffled, otherwise the order saved at turn-on). Playback continues from the current video at its position in that order (Task 6). If `source === "library"`: `writeLibraryView({ ...view, sort: view.shuffle?.previousSort ?? "", shuffle: null })`.
- No `source` (opened from Today): only the queue order changes.

- [ ] **Step 1: Write failing tests** (reuse `turnOn()` helper; stub `Math.random`):
  - queue published with `source: "library"`, not shuffled: 🔀 off; tap it while `b` plays → chip pressed, 次は lists the other ids in shuffled order, `b` still current; `readLibraryView()` has `sort: "shuffle"`, `shuffle.order[0] === "b"`.
  - tap again → 次は back to original order after `b`; `readLibraryView().sort` is the stored `previousSort`, `shuffle` null.
  - queue published with `shuffled: true, unshuffledIds` → chip starts pressed; turning it off restores `unshuffledIds` order.
  - queue without `source` → toggling never writes `LIBRARY_VIEW_STORAGE_KEY`.
  - chip tapped before the first video starts / with a one-video queue → no error, displayed video first.
- [ ] **Step 2: Run** `npx vitest run src/features/playlist/components/player-screen.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run` (full suite) and `npx eslint src` — Expected: all PASS, no new lint warnings.
- [ ] **Step 5: Commit** `feat(player): shuffle chip linked to the library's sort`
