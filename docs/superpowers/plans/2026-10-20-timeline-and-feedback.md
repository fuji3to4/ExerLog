# 1日タイムライン・記録時刻・リアクション・BMI・日本語化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 体調・動画視聴・運動を時刻付きで何件でも記録し、「今日」と履歴に縦タイムラインで表示する。あわせて次の4つを入れる。
- 保存リアクション
- BMI
- カレンダーの花丸
- 日本語化

修正・削除は Google スプレッドシートにも反映させる。

**Architecture:**
- **新しい Dexie テーブル**：`exerciseLogs`、`wellnessEntries`、`watchEvents`、`tombstones` を追加する。
- **タイムライン**：純粋関数 `buildTimeline` が、時刻順の並びと自動ラベルを作る。共有コンポーネント `TimelineSection` は「今日」と履歴の両方で使う。
- **同期**：「シートと手元を id でマージする（新しい `updatedAt` を優先）」＋「削除記録（tombstone）」＋「タブ全体の書き直し」に作り替える。

**Tech Stack:** Next.js 15 (App Router, static export)、React 19、TypeScript、Dexie 4.0.10、Tailwind/shadcn (Radix Dialog)、Recharts、Vitest + fake-indexeddb + Testing Library

**Spec:** `docs/superpowers/specs/2026-10-20-timeline-and-feedback-design.md`

## Global Constraints

- 既存データとの互換は不要。IndexedDB とスプレッドシートは作り直してよい。古いデータの移行処理は書かない。
- 新しい依存パッケージは追加しない。アニメーションは CSS（`globals.css` の keyframes）で作る。
- 時刻はすべて、オフセット付きのローカル ISO 文字列で持つ（例 `2026-10-20T18:03:00+09:00`）。`date` は `YYYY-MM-DD`（`toDayKey`）。
- 動画と運動の長さは秒（`durationSeconds: number`）で持つ。表示は `m:ss`（1時間以上は `h:mm:ss`）にする。
- 画面の文言はすべて `src/features/i18n/messages/{ja,en}.ts` を通す。ハードコードした英語文言は残さない。
- 保存したときに画面下のトースト通知は出さない。
- BMI は数値のみで、小数1桁。判定（肥満度など）は出さない。
- データを変える repository 関数は、すべて最後に `scheduleSync()` を呼ぶ。削除するときは、必ず `recordTombstones()` で削除記録を残す。
- 各タスクの終わりで次の3つが通ること。
  - `npx tsc --noEmit`
  - `npm test`
  - `npm run lint`

## Review Focus

- **時刻を直して並び順が入れ替わったとき**：タイムラインがすぐに並べ替わり、ラベル（動画前・動画後など）も付け直される（Task 4 と Task 6 のテスト）。
- **旧形式のタブ・ヘッダーが残ったスプレッドシートに同期したとき**：例外にならない。ヘッダーが違うタブは空として扱い、新しいヘッダーで書き直す（Task 3 のテスト）。
- **端末Aで削除し、端末Bにはまだその記録が残っている状態で同期したとき**：記録は復活しない（Task 3 のテスト）。
- **身長が未記録の状態で体重を入れたとき**：BMI の代わりに「身長を記録するとBMIが出ます」を表示する。BMI の計算には、別の日に記録した身長も使う（Task 9 のテスト）。
- **0:30 のような深夜の体調記録**：その日の記録として残り、朝・夜のラベルは付かない（Task 4 のテスト）。

---

## File Structure

| ファイル | 役割 |
|---|---|
| `src/lib/date/local-iso.ts` | `localIsoAt`、`withLocalTime`、`timeOfIso` を追加 |
| `src/lib/date/duration.ts` | 新規：秒の整形・分解・合成 |
| `src/lib/types.ts` | `ExerciseLog`（新）、`WellnessEntry`、`WatchEvent`、`Tombstone`。`durationSeconds` |
| `src/features/storage/app-db.ts` | v7（新テーブル追加＋データ消去）、v8（旧テーブル削除） |
| `src/features/storage/{wellness-entries,watch-events,tombstones}.repository.ts` | 新規 |
| `src/features/storage/exercise-logs.repository.ts` | 複数件・時刻・長さに対応して書き直し |
| `src/features/sync/merge-records.ts` | 新規：純粋なマージ関数 |
| `src/features/sync/{sync-engine,sync-config,google-sheets}.ts` | マージ同期に作り替え |
| `src/features/timeline/build-timeline.ts` | 新規：並び替えとラベル判定 |
| `src/features/timeline/use-day-timeline.ts` | 新規：1日分を読み込むフック |
| `src/features/timeline/components/*` | 新規：`DayTimeline`、各ダイアログ、`TimelineSection` |
| `src/features/feedback/*` | 新規：`useSavedFlash`、`SaveButton`、`CelebrationProvider`/`useCelebrate` |
| `src/features/metrics/bmi.ts` | 新規：BMI 計算 |

---

### Task 1: 動画の長さを秒単位にする

**Files:**
- Create: `src/lib/date/duration.ts`、`src/lib/date/duration.test.ts`
- Modify:
  - `src/lib/types.ts`（`ExerciseVideo.durationMinutes` を `durationSeconds` にする）
  - `scripts/csv-to-catalog.js`（＋test）
  - `src/features/catalog/exercise-catalog.default.ts`（値は×60）
  - `src/features/settings/csv/exercise-csv.ts`
  - `src/features/settings/components/exercise-form-modal.tsx`
  - `src/features/sync/sync-config.ts`（Exercises の列名）
  - `src/features/storage/app-db.ts`（exercises のインデックス名。v7 は Task 2 で作るので、ここではまだ変えない）
  - `recommended-exercise-card.tsx`、`exercise-detail-screen.tsx`、`library-screen.tsx`（表示）
  - `messages/{ja,en}.ts`
- 手元のみ（gitignore 対象）：`public/exercises.csv` の列を `durationSeconds` にして値を×60。コミットには含めない。完了報告で「手元のCSVを書き換えた」と伝える。

**Interfaces:**
- Produces:
  - `formatDuration(seconds: number): string`。例：`330→"5:30"`、`45→"0:45"`、`3723→"1:02:03"`。
  - `splitDuration(seconds: number): { minutes: number; seconds: number }`
  - `joinDuration(minutes: number, seconds: number): number`
  - `ExerciseVideo.durationSeconds: number`

- [ ] **Step 1: 失敗するテストを書く**
  - `duration.test.ts` で、上の3つの例が成り立つことを確かめる。
  - 次の2つも確かめる。
    - `splitDuration(330)` が `{minutes:5, seconds:30}` になる。
    - `joinDuration(5,30)` が `330` になる。
  - `csv-to-catalog.test.js` で次の2つを確かめる。
    - `durationSeconds` 列が `330` の行が `durationSeconds: 330` になる。
    - 列がない、または 0 以下のときはエラーになる。
  - `exercise-csv` の取り込みでも同じことを確かめる。
- [ ] **Step 2:** `npx vitest run src/lib/date/duration.test.ts scripts/csv-to-catalog.test.js` を実行し、FAIL することを確認する。
- [ ] **Step 3: 実装する**
  - 上の関数を実装する。
  - `durationMinutes` をすべて `durationSeconds` に置き換える（`grep -rn durationMinutes src scripts` が 0 件になるまで）。
  - 表示は、`t("duration_minutes",…)` をやめて `formatDuration` にする。
  - ライブラリ編集フォームは、「分」「秒」の2つの数値欄にして、`joinDuration` で保存する。
  - 文言キーの扱い：
    - `settings_form_duration_label` を「長さ」にする。
    - 新規に `settings_form_duration_minutes`（分）と `settings_form_duration_seconds`（秒）を追加する。
    - `duration_minutes` キーは削除する。
- [ ] **Step 4:** `npx tsc --noEmit && npm test` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: store exercise duration in seconds"`

---

### Task 2: 新しい記録モデル（テーブル・repository・時刻ヘルパー）

**Files:**
- Modify:
  - `src/lib/types.ts`
  - `src/lib/date/local-iso.ts`（＋`local-iso.test.ts`）
  - `src/features/storage/app-db.ts`
  - `src/features/storage/exercise-logs.repository.ts`
  - `src/features/storage/daily-metrics.repository.ts`
  - `src/features/storage/daily-self-care.repository.ts`
  - `src/features/storage/exercise-catalog.repository.ts`
  - `src/features/storage/self-care-catalog.repository.ts`
- Create:
  - `src/features/storage/wellness-entries.repository.ts`
  - `src/features/storage/watch-events.repository.ts`
  - `src/features/storage/tombstones.repository.ts`
  - `src/features/storage/timeline-storage.test.ts`

**Interfaces:**
- Produces（types.ts）:

```ts
export type ExerciseLog = { id: string; date: string; exerciseId: string; result: ExerciseLogResult;
  performedAt: string; durationSeconds: number; updatedAt: string };
export type WellnessEntry = { id: string; date: string; recordedAt: string; physicalScore: WellnessScore;
  mentalScore: WellnessScore; note: string; updatedAt: string };
export type WatchEvent = { id: string; date: string; exerciseId: string; watchedAt: string; updatedAt: string };
export type Tombstone = { id: string /* `${table}:${recordId}` */; table: string; recordId: string; deletedAt: string };
```

  - 旧 `ExerciseLog` は `LegacyExerciseLog` に改名し、既存の呼び出し側をそれに合わせる。旧テーブル `logs` と `dailyWellness` は Task 12 で消す。
- Produces（date）:
  - `localIsoAt(dayKey: string, clock?: Date): string`：日付は `dayKey`、時分秒は `clock`（既定は現在）、オフセットはローカル。
  - `withLocalTime(iso: string, hhmm: string): string`：日付とオフセットは変えず、時分を置き換えて秒を `00` にする。
  - `timeOfIso(iso: string): string`：`iso.slice(11,16)` を返す。
- Produces（repositories）。追加系はすべて `id = crypto.randomUUID()`、`updatedAt = localIsoNow()` にする。
  - `addWellnessEntry(input: { date; physicalScore; mentalScore; note; recordedAt?: string }): Promise<WellnessEntry>`：`recordedAt` の既定は `localIsoAt(date)`。`note` は trim する。
  - `updateWellnessEntry(entry: WellnessEntry): Promise<void>`
  - `deleteWellnessEntry(id: string): Promise<void>`
  - `listWellnessEntriesForDay(date): Promise<WellnessEntry[]>`（recordedAt の昇順）
  - `getLatestWellnessEntry(date): Promise<WellnessEntry | undefined>`
  - `listWellnessEntriesInRange(start, end): Promise<WellnessEntry[]>`
  - `recordWatchEvent(input: { exerciseId; date?: string; watchedAt?: string }): Promise<WatchEvent | null>`
    - `WATCH_DEDUPE_MS = 600_000` を export する。
    - 同じ `exerciseId` の視聴が、`watchedAt` の前10分以内にあれば作らずに `null` を返す。
    - `date` の既定は `toDayKey(new Date())`。
  - `updateWatchEvent(e: WatchEvent)`、`deleteWatchEvent(id)`、`listWatchEventsForDay(date)`
  - `addExerciseLog(input: { date; exerciseId; result; durationSeconds; performedAt?: string }): Promise<ExerciseLog>`
  - `updateExerciseLog(log: ExerciseLog)`、`deleteExerciseLog(id)`、`listExerciseLogsForDay(date)`
  - `countExerciseLogsForDay(date): Promise<Record<string, number>>`
  - `clearAllExerciseLogs()`
  - `recordTombstones(table: string, recordIds: string[]): Promise<void>`、`listTombstones(): Promise<Tombstone[]>`
  - `table` には、Task 3 の `SHEET_TABS` と同じ文字列を使う。
    - 体調は `"WellnessEntries"`、視聴は `"WatchEvents"`、運動は `"ExerciseLogs"`。
    - 体の数値は `"DailyMetrics"`、セルフケアは `"DailySelfCare"`、動画は `"Exercises"`、セルフケアの項目は `"SelfCareCatalog"`。
  - 既存の metrics・self-care・catalog の削除系（`replaceDailyMetrics`、`deleteDailyMetric`、ライブラリ削除、全削除など）も、消える id の削除記録を残すようにする。

- [ ] **Step 1: 失敗するテストを書く**
  - `timeline-storage.test.ts`（fake-indexeddb）で次を確かめる。
    - 同じ日・同じ動画に `addExerciseLog` を2回呼ぶと、`countExerciseLogsForDay` が `{[id]: 2}` になる。
    - `addWellnessEntry` を 7:10 と 22:30 で2件入れると、`listWellnessEntriesForDay` が時刻順の2件を返し、`getLatestWellnessEntry` が 22:30 の方を返す。
    - `recordWatchEvent` を 18:03 で呼んだあと、18:12 で呼ぶと `null`、18:14 で呼ぶと新しい1件が返る。
    - `deleteWellnessEntry(id)` のあと、`listTombstones()` に `{id:"WellnessEntries:"+id, table:"WellnessEntries", recordId:id}` が含まれる。
    - `replaceDailyMetrics` で消えた id の削除記録が残る。
  - `local-iso.test.ts` で次を確かめる。
    - `withLocalTime("2026-10-20T18:03:41+09:00","07:05")` が `"2026-10-20T07:05:00+09:00"` になる。
    - `localIsoAt("2026-10-01", new Date(2026,9,20,9,15,0))` が `"2026-10-01T09:15:00"` で始まる。
- [ ] **Step 2:** `npx vitest run src/features/storage/timeline-storage.test.ts src/lib/date` を実行し、FAIL することを確認する。
- [ ] **Step 3: スキーマ v7 を追加する**
  - v7 で追加・変更するテーブル：
    - `exerciseLogs: "id, date, exerciseId, performedAt"`
    - `wellnessEntries: "id, date, recordedAt"`
    - `watchEvents: "id, date, exerciseId, watchedAt"`
    - `tombstones: "id, table"`
    - `exercises: "id, title, bodyArea, purpose, durationSeconds, intensity"`
  - 既存の `logs` と `dailyWellness` は v7 では残す。
  - `.upgrade()` で `logs`、`dailyWellness`、`dailyMetrics`、`dailySelfCareLogs`、`exercises` を clear する。exercises を空にするのは、起動時のシード確認を再び出して秒単位で入れ直すため。
  - そのうえで上の repository を実装する。
- [ ] **Step 4:** `npx tsc --noEmit && npm test` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: add multi-entry timeline records and tombstones"`

---

### Task 3: 同期をマージ方式に作り替える（修正・削除をシートへ反映）

**Files:**
- Create: `src/features/sync/merge-records.ts`、`src/features/sync/merge-records.test.ts`
- Modify:
  - `src/features/sync/sync-config.ts`
  - `src/features/sync/sync-engine.ts`（＋test）
  - `src/features/sync/google-sheets.ts`（＋test）
  - `src/features/sync/SyncProvider.tsx`（＋test）
  - `src/features/sync/auto-sync.ts`

**Interfaces:**
- Consumes：Task 2 の型、`listTombstones`、各テーブル。
- Produces:
  - `SHEET_TABS = ["ExerciseLogs","WellnessEntries","WatchEvents","DailyMetrics","DailySelfCare","Exercises","SelfCareCatalog","Tombstones"] as const`
  - `TableSyncConfig`：`{ tabName: SheetTab; keyColumn: string; updatedAtKey: string | null; deletable: boolean; headers: string[]; toRow; fromRow; readFromDb; replaceDb(records: any[]): Promise<void> }`
    - `clearDb` と `bulkWriteDb` はなくす。
    - `updatedAtKey` の値：
      - 運動・体調・視聴は `"updatedAt"`
      - 体の数値とセルフケアは `"recordedAt"`
      - 削除記録は `"deletedAt"`
      - 動画とセルフケアの項目は `null`
  - `mergeRecords(args: { local: any[]; remote: any[]; keyColumn: string; updatedAtKey: string | null; deletedIds: Set<string> }): any[]`：純粋関数。
    - id ごとに、`updatedAtKey` の値が新しい方を採る（`Date.parse` で比べる。同じなら local）。
    - `updatedAtKey === null` のときは local を優先する。
    - 片方にしかない id はそのまま残す。
    - `deletedIds` に入っている id は除く。
  - `replaceAllRows(accessToken, spreadsheetId, sheetName, rows: string[][]): Promise<boolean>`
    - まず `POST values/{tab}!A:ZZ:clear` を呼ぶ。
    - 次に `PUT values/{tab}!A1?valueInputOption=RAW` で、ヘッダー行を含む全行を書く。
  - `syncAll(accessToken: string, onProgress?: (r: SyncTableResult) => void): Promise<SyncAllResult>`
    - `SyncMode` 引数はなくす。
    - `SyncTableResult = { tableName: string; rowCount: number; error?: string }`
  - 使わなくなった `readSheetColumn`、`appendRows`、`appendRowsBatched`、`writeHeaders`、`downloadAndReplaceAll` は削除する。

同期の流れ（直列で行う）：

1. スプレッドシートとタブを用意する（`ensureSheetTabs`）。
2. **Tombstones** タブを最初にマージする。
3. マージした削除記録から、タブごとの `deletedIds` を作る。
4. 残りのタブを順にマージする。各タブでは次の処理をする。
   - `readAllRows` で読む。1行目が `config.headers` と完全に一致しなければ、`remote = []` として扱う（旧形式のシート対策）。
   - Dexie の `rw` トランザクションの中で、手元をもう一度読む。`mergeRecords` をかけて `replaceDb` する。トランザクションの中で読み直すのは、読んでから書くまでの間に追加された記録を失わないため。
   - 最後に `replaceAllRows` でシートに書く。

- [ ] **Step 1: 失敗するテストを書く**
  - `merge-records.test.ts` で次を確かめる。
    - local と remote に同じ id があり、remote の `updatedAt` の方が新しいと、remote が採られる。
    - remote にしかない id が残る。
    - `deletedIds` に入っている id は、local と remote の両方から消える。
    - `updatedAtKey:null` のときは local が勝つ。
  - `sync-engine.test.ts` で、`fetch` をモックして次を確かめる。
    - 手元で削除した記録（削除記録あり）が、シートに残っていても同期後に手元にもシートにも無い。
    - 手元で時刻を直した記録は、同期後のシートの行にも新しい時刻が入る。
    - ヘッダーが `["date","physicalScore",…]` の旧タブがあっても例外にならず、新ヘッダーで書き直される。
  - `google-sheets.test.ts` で、`replaceAllRows` が clear → PUT(RAW) の順に呼ぶことを確かめる。
- [ ] **Step 2:** `npx vitest run src/features/sync` を実行し、FAIL することを確認する。
- [ ] **Step 3: 実装する**
  - 上の仕組みを実装する。
  - `SyncProvider` の `syncNow` と `auto-sync` を新しい `syncAll` に合わせる。
  - 進捗の文言は、次のキーにして i18n を通す。
    - `sync_status_starting`（同期を開始しています…）
    - `sync_status_table`（{table} を同期しました（{count}件））
- [ ] **Step 4:** `npx tsc --noEmit && npm test` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: merge-based sync with tombstones so edits and deletes reach sheets"`

---

### Task 4: タイムラインの組み立てとラベル判定（純粋関数）

**Files:**
- Create: `src/features/timeline/build-timeline.ts`、`src/features/timeline/build-timeline.test.ts`

**Interfaces:**
- Consumes：`WellnessEntry`、`WatchEvent`、`ExerciseLog`
- Produces:

```ts
export type WellnessLabel = "morning" | "beforeVideo" | "afterVideo" | "night";
export type TimelineItem =
  | { kind: "wellness"; id: string; at: string; entry: WellnessEntry; label: WellnessLabel | null }
  | { kind: "watch"; id: string; at: string; event: WatchEvent; title: string }
  | { kind: "exercise"; id: string; at: string; log: ExerciseLog; title: string };
export const LABEL_WINDOW_MS = 30 * 60_000;
export function labelWellness(entry: WellnessEntry, watches: WatchEvent[], logs: ExerciseLog[]): WellnessLabel | null;
export function buildTimeline(input: { wellness: WellnessEntry[]; watches: WatchEvent[]; logs: ExerciseLog[]; titles: Map<string, string> }): TimelineItem[];
```

ラベルの規則（`Date.parse` の差で判定する）：

1. **動画前の候補**：ある視聴 `w` について、`0 ≤ w − e ≤ 30分`。
2. **動画後の候補**：ある視聴または運動 `x` について、`0 < e − x ≤ 30分`。
3. 両方の候補があるときは、近い方を採る。同じ距離なら `afterVideo` にする。
4. どちらの候補もなければ、`timeOfIso(recordedAt)` の時で判定する。4〜10時なら `morning`、18時以降なら `night`、それ以外は `null`。

`buildTimeline` は `at` の昇順に並べる。同じ時刻のときは wellness → watch → exercise の順にする。`title` が見つからないときは `exerciseId` を使う。

- [ ] **Step 1: 失敗するテストを書く**（すべて `+09:00` の固定 ISO を使う）
  - 7:10 の体調は `morning`、22:30 は `night`、0:30 は `null`、13:00 は `null`。
  - 視聴 18:03 のとき、体調 18:02 は `beforeVideo`、18:10 は `afterVideo`。17:20 は `null`（31分以上前で、時刻規則にも当たらない）。
  - 運動 18:03 のあとの 18:20 の体調は `afterVideo`。
  - 視聴 18:00 と 18:40 の間にある 18:25 の体調は、`afterVideo`（25分）と `beforeVideo`（15分）の近い方なので `beforeVideo`。
  - `buildTimeline` で、体調 22:30、視聴 18:03、運動 18:03、体調 7:10 を入れると、kind が `wellness, watch, exercise, wellness` の順で並ぶ。
  - 体調の時刻を 18:02 から 18:30 に変えて `buildTimeline` をもう一度呼ぶと、並び順とラベルが変わる。
- [ ] **Step 2:** `npx vitest run src/features/timeline/build-timeline.test.ts` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 上のシグネチャで実装する。
- [ ] **Step 4:** 同じコマンドを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: build day timeline with automatic wellness labels"`

---

### Task 5: リアクション部品（保存フラッシュ・花丸・ハイライト）

**Files:**
- Create:
  - `src/features/feedback/use-saved-flash.ts`
  - `src/features/feedback/save-button.tsx`
  - `src/features/feedback/celebration.tsx`
  - `src/features/feedback/feedback.test.tsx`
- Modify:
  - `src/app/globals.css`（keyframes `pop` と、クラス `.save-button--saved`、`.timeline-item--new`、`.celebration-overlay`）
  - `src/app/layout.tsx`（`CelebrationProvider` を設置）
  - `messages/{ja,en}.ts`

**Interfaces:**
- Produces:
  - `SAVED_FLASH_MS = 1500`
  - `useSavedFlash(): { isSaved: boolean; flash(): void }`
  - `SaveButton(props: ButtonProps & { isSaved: boolean })`
    - `isSaved` のときは、ラベルを `t("feedback_saved")`（✓ 保存しました）にして、緑の `save-button--saved` を付ける。
    - それ以外のときは `children` を表示する。
  - `CelebrationProvider({children})`
  - `useCelebrate(): (input: { result: ExerciseLogResult; durationSeconds: number }) => void`
    - 1.6秒間、`.celebration-overlay` に 💮 と文言を出す。
    - `navigator.vibrate?.(80)` を呼ぶ。
    - 文言は、did なら `t("celebration_did", { duration: formatDuration(s) })`（おつかれさま！ {duration} やりました）、partial なら `t("celebration_partial")`（おつかれさま！）。
    - overlay は `aria-live="polite"` で、クリックを妨げない（`pointer-events:none`）。

- [ ] **Step 1: 失敗するテストを書く**（fake timers を使う）
  - `SaveButton` の `flash()` 後に「✓ 保存しました」が表示され、1500ms 後に元のラベルに戻る。
  - `useCelebrate()({result:"did", durationSeconds:330})` を呼ぶと「おつかれさま！ 5:30 やりました」が表示され、`navigator.vibrate` が 80 で呼ばれる。vibrate が無い環境でも例外にならない。
  - partial のときは「おつかれさま！」だけが表示される。
- [ ] **Step 2:** `npx vitest run src/features/feedback` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** 同じコマンドを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: add save flash, celebration overlay and highlight styles"`

---

### Task 6: タイムラインの画面部品（表示・追加・編集・削除）

**Files:**
- Create（すべて `src/features/timeline/` の下）:
  - `use-day-timeline.ts`
  - `components/day-timeline.tsx`
  - `components/wellness-entry-dialog.tsx`
  - `components/exercise-log-dialog.tsx`
  - `components/watch-event-dialog.tsx`
  - `components/timeline-section.tsx`
  - `components/timeline-section.test.tsx`
- Modify: `messages/{ja,en}.ts`

**Interfaces:**
- Consumes：Task 2 の repositories、Task 4 の `buildTimeline`、Task 5 の `SaveButton`・`useSavedFlash`、`src/components/ui/dialog.tsx`、`WellnessScoreInput`（`src/features/self-care/components/wellness-score-input.tsx`）
- Produces:
  - `type DayTimelineState = { items: TimelineItem[]; isLoaded: boolean; highlightId: string | null; reload(highlightId?: string): Promise<void> }`
  - `useDayTimeline(date: string): DayTimelineState`
  - `DayTimeline({ items, highlightId, onSelect(item: TimelineItem) })`
    - 縦の時刻ライン（モックアップ案A）。左に `timeOfIso(at)` を出す。点の色は `--c` で、体調 `#e48a3a`、視聴 `#4a7bd0`、運動 `#3aa76d`。
    - 体調の行には、ラベルを「朝」「動画前」「動画後」「夜」の小さなタグで出す。
    - 運動の行には「✅ {title} やった/一部できた」と `formatDuration(durationSeconds)` を出す。
    - 視聴の行には「▶ {title}を視聴」と出す。
    - `highlightId` に当たる行には `timeline-item--new` を付ける。
    - 記録が0件なら `t("timeline_empty")` を出す。
  - `WellnessEntryDialog({ open, onOpenChange, date, entry?: WellnessEntry, onSaved(entry: WellnessEntry): void, onDeleted?(): void })`
    - 入力欄は、時刻（`<input type="time">`）、からだ、こころ、メモ。
    - 新規のとき、時刻の初期値は開いた時点の `timeOfIso(localIsoAt(date))`。
    - 保存ボタンは `SaveButton` で、押したら flash してからダイアログを閉じる。
    - 編集のときは削除ボタンを出す。
  - `ExerciseLogDialog({ open, onOpenChange, log: ExerciseLog, onSaved, onDeleted })`
    - 入力欄は、時刻、結果（やった/一部できた）、長さ（分・秒）。
  - `WatchEventDialog({ open, onOpenChange, event: WatchEvent, onSaved, onDeleted })`
    - 入力欄は時刻だけ。削除もできる。
  - `TimelineSection({ date: string; timeline: DayTimelineState; onChanged?(): void })`
    - 上部に「＋ 体調を記録」ボタンと「動画を選ぶ」ボタン（`/library` へのリンク）を置き、その下に `DayTimeline` を出す。
    - 行をタップすると、種類に合ったダイアログが開く。
    - 保存・削除のあとは `timeline.reload(新規ならその id)` を呼び、続けて `onChanged?.()` を呼ぶ。
    - 日付は `date` に固定する。時刻の変更は `withLocalTime` で行う。

- [ ] **Step 1: 失敗するテストを書く**
  - `timeline-section.test.tsx`（fake-indexeddb）で次を確かめる。
    - 「＋ 体調を記録」→ からだ4 → 保存 で、タイムラインに「からだ4」の行が増え、その行に `timeline-item--new` が付く。
    - その行をタップして時刻を 07:05 に変えて保存すると、行が先頭に移り「朝」のタグが付く。
    - 削除すると行が消え、`listTombstones()` に削除記録が増える。
    - 運動の行を開いて長さを 3分15秒 にして保存すると、「3:15」と表示される。
- [ ] **Step 2:** `npx vitest run src/features/timeline` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
  - 追加する文言キー：
    - `timeline_add_wellness`
    - `timeline_choose_video`
    - `timeline_empty`
    - `timeline_label_morning`、`timeline_label_before_video`、`timeline_label_after_video`、`timeline_label_night`
    - `timeline_watched`
    - `timeline_edit_time`
    - `timeline_duration_minutes`、`timeline_duration_seconds`
    - `timeline_delete`、`timeline_delete_confirm`
- [ ] **Step 4:** 同じコマンドを実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: add day timeline section with add/edit/delete dialogs"`

---

### Task 7: 「今日」画面をタイムライン中心にする

**Files:**
- Modify:
  - `src/features/today/use-today-data.ts`
  - `src/features/today/components/today-screen.tsx`
  - `src/features/today/components/recommended-exercise-card.tsx`（＋test）
  - `src/features/logging/components/exercise-log-actions.tsx`
  - `src/app/page.test.tsx`
- Delete: `src/features/today/components/daily-condition-card.tsx`（＋test）

**Interfaces:**
- Consumes：`useDayTimeline`、`TimelineSection`、`useCelebrate`、`addExerciseLog`、`countExerciseLogsForDay`、`getLatestWellnessEntry`
- Produces:
  - `useTodayData(date)` は `{ isHydrated, recommendations, logCounts: Record<string, number>, logExercise(exercise: ExerciseVideo, result: ExerciseLogResult): Promise<ExerciseLog>, refreshLatestWellness(): Promise<void> }` を返す。
    - おすすめは、`getLatestWellnessEntry(date)` のスコアを `mapWellnessToCondition` に渡して決める。記録がなければ、からだ3・こころ3として扱う。
  - `ExerciseLogActions({ todayCount: number; onLog(result: ExerciseLogResult): void })`
    - 「やった」「一部できた」の2つのボタンを出す。押すたびに1件追加される。
    - 「できなかった」（clear）ボタンと、選択中の表示はなくす。
    - 状態の表示は `t("log_count_today", { count })`（今日{count}回）にする。count が 0 のときは `t("result_not_logged")` にする。
  - `RecommendedExerciseCard` のプロップは `{ exercise, todayCount, watchHref, onLog }` にする。

- [ ] **Step 1: 失敗するテストを書く**
  - `recommended-exercise-card.test.tsx` で、「やった」を2回押すと `onLog("did")` が2回呼ばれ、`todayCount=2` のとき「今日2回」と表示されることを確かめる。
  - `page.test.tsx` で次を確かめる。
    - 今日画面に「＋ 体調を記録」がある。
    - 「やった」を押すと、タイムラインに運動の行が増え、花丸の文言が出る。
    - 体調をからだ1・こころ1で追加すると、おすすめが「疲れ」向けに変わる（`get-todays-recommendations` が `tired` で呼ばれる、または表示されるおすすめで確かめる）。
- [ ] **Step 2:** `npx vitest run src/app/page.test.tsx src/features/today` を実行し、FAIL することを確認する。
- [ ] **Step 3: 実装する**
  - `TodayScreen` で `useDayTimeline(date)` を持ち、ヘッダーの下に `TimelineSection` を置く。
  - `logExercise` の流れ：
    1. `addExerciseLog({ durationSeconds: exercise.durationSeconds, performedAt: localIsoAt(date) })` を呼ぶ。
    2. `celebrate` を呼ぶ。
    3. `timeline.reload(newId)` を呼ぶ。
    4. 回数を更新する。
  - `TimelineSection` の `onChanged` で `refreshLatestWellness` を呼ぶ。
- [ ] **Step 4:** `npx tsc --noEmit && npm test` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: today screen timeline with repeatable exercise logs"`

---

### Task 8: 動画詳細画面で視聴と運動を記録する

**Files:**
- Modify: `src/features/library/components/exercise-detail-screen.tsx`（＋test）

**Interfaces:**
- Consumes：`recordWatchEvent`、`addExerciseLog`、`countExerciseLogsForDay`、`useCelebrate`、`ExerciseLogActions`（Task 7 の新しいプロップ）

- [ ] **Step 1: 失敗するテストを書く**
  - 再生ボタン（`action_play_video_aria`）を押すと、今日の `watchEvents` が1件になる。続けてもう一度押しても1件のまま（`recordWatchEvent` を2回呼ばない、または null が返る）。
  - `embedUrl` がない動画で「動画を見る」リンクを押しても1件記録される。
  - 「やった」を押すと、`exerciseLogs` が1件増え、`durationSeconds === exercise.durationSeconds` になり、花丸の文言が出る。
- [ ] **Step 2:** `npx vitest run src/features/library/components/exercise-detail-screen.test.tsx` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
  - 再生ボタンの `onClick` と外部リンクの `onClick` で `void recordWatchEvent({ exerciseId })` を呼ぶ。
  - `handleClear` と `deleteExerciseLogByDateAndExercise` は削除する。
- [ ] **Step 4:** 同じコマンドと `npx tsc --noEmit` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: record video watches and repeatable logs on detail screen"`

---

### Task 9: 体調画面（体調は追加式、BMI 表示）

**Files:**
- Create: `src/features/metrics/bmi.ts`、`src/features/metrics/bmi.test.ts`
- Modify:
  - `src/features/storage/daily-metrics.repository.ts`
  - `src/features/self-care/use-self-care-data.ts`
  - `src/features/self-care/components/self-care-screen.tsx`（＋`self-care-screen.test.tsx`）
  - `src/features/self-care/components/metrics-card.tsx`
  - `src/features/self-care/components/wellness-card.tsx`
  - `messages/{ja,en}.ts`

**Interfaces:**
- Produces:
  - `calculateBmi(weightKg: number, heightCm: number): number | null`
    - どちらかが 0 以下、または数でなければ `null` を返す。
    - 計算は `Math.round(w / (h/100)^2 * 10) / 10`。
  - `findLatestHeightOnOrBefore(date: string): Promise<number | null>`（daily-metrics.repository）
  - `listMetricEntriesInRange(metricType: MetricType, start: string, end: string): Promise<DailyMetricEntry[]>`（Task 10 で使う）
  - `MetricsCard` に `bmi: number | null` を追加する。
    - 体重の欄の下に「BMI {value}」を出す。
    - 体重が入っていて身長が見つからないときは `t("bmi_need_height")`（身長を記録するとBMIが出ます）を出す。
    - 体重が空のときは何も出さない。
  - `useSelfCareData` から wellness の状態を取り除く。`save()` は体の数値だけを保存し、`isSaved` 用に `useSavedFlash` を使う。
  - `bmi` の計算：
    - 体重は入力欄の値を使う。
    - 身長は、入力欄が空でなければその値を使い、空なら `findLatestHeightOnOrBefore(dayKey)` の値を使う。
- `WellnessCard` は、「＋ 体調を記録」ボタンで `WellnessEntryDialog` を開く形にする。保存後は「✓ 保存しました」のフラッシュを出す。

- [ ] **Step 1: 失敗するテストを書く**
  - `bmi.test.ts` で次を確かめる。
    - `calculateBmi(60,170)` が `20.8` になる。
    - `calculateBmi(60,0)` が `null` になる。
  - `self-care-screen.test.tsx` で次を確かめる。
    - 10/1 に身長170を保存しておき、10/20 に体重60を入力すると「BMI 20.8」と表示される。
    - 身長がないときに体重を入れると「身長を記録するとBMIが出ます」と表示される。
    - 保存ボタンを押すと「✓ 保存しました」と表示される。
- [ ] **Step 2:** `npx vitest run src/features/metrics src/features/self-care` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** `npx tsc --noEmit && npm test` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: BMI on weight entry and add-style wellness on condition screen"`

---

### Task 10: 履歴（日別タイムライン・カレンダーの印・グラフ）

**Files:**
- Modify:
  - `src/features/history/history-query.ts`
  - `src/features/history/history-graph-query.ts`（＋test）
  - `src/features/history/components/history-calendar.tsx`
  - `src/features/history/components/history-screen.tsx`（＋test）
  - `src/features/history/components/history-dashboard.tsx`
  - `src/features/history/components/day-summary.tsx`（＋test）
  - `src/features/history/components/history-graphs.tsx`（＋test）
  - `src/app/globals.css`
  - `messages/{ja,en}.ts`

**Interfaces:**
- Consumes：`TimelineSection`、`useDayTimeline`、`calculateBmi`、`listMetricEntriesInRange`、`listWellnessEntriesInRange`
- Produces:
  - `listCalendarMarksInMonth(month: string): Promise<Record<string, "exercise" | "record">>`
    - その日に `exerciseLogs` があれば `"exercise"` にする。
    - 運動はなくても `wellnessEntries` か `watchEvents` があれば `"record"` にする。
    - `listCompletedDaysInMonth` は削除する。
  - `HistoryCalendar` は `completedDays` の代わりに `marks: Record<string, "exercise" | "record">` を受け取る。
    - exercise の日は、日付の上に 💮 バッジ（`.history-calendar__hanamaru`）を出す。aria は既存の `history_calendar_completed_label` を使う。
    - record の日は、小さな点（`.history-calendar__dot`）を出す。aria は新しい `history_calendar_recorded_label` を使う。
  - `HistoryDaySummary` から `logs` と `wellness` をなくす。`DaySummary` には体の数値とセルフケアの部分だけを残す。
  - 履歴の日別表示（`history-screen` と `history-dashboard` の両方）では、`DaySummary` の上に、選んだ日の `TimelineSection` を置く。
  - `GraphMetricSelection` に `{ kind: "bmi" }` を追加する。`GraphSeries` は `{ unit: string; points: GraphPoint[] }` にする（使っていない `label` は削除する）。
    - bmi は、範囲内の体重記録ごとに、その日以前で最新の身長を使って `calculateBmi` を計算する。身長がない点は除く。unit は `""`。
    - wellness は `wellnessEntries` を日ごとに平均し、小数1桁にする。
    - selfCare の unit は `""` にする（英語の単位文言はなくす）。

- [ ] **Step 1: 失敗するテストを書く**
  - `history-graph-query.test.ts` で次を確かめる。
    - 10/20 に体調が からだ2 と からだ4 の2件あると、physical の点は `{date:"2026-10-20", value:3}` の1点になる。
    - 身長170（10/1）、体重60（10/20）、体重62（9/30、この日以前に身長なし）の範囲では、BMI 系列は `[{date:"2026-10-20", value:20.8}]` になる。
  - `history-screen.test.tsx` で次を確かめる。
    - 運動した日のセルに 💮 がある。
    - 体調だけの日のセルに `.history-calendar__dot` がある。
    - 過去の日を選んで「＋ 体調を記録」で追加すると、その日のタイムラインに出る。
- [ ] **Step 2:** `npx vitest run src/features/history` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** `npx tsc --noEmit && npm test` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "feat: history timeline, hanamaru calendar marks and BMI graph"`

---

### Task 11: 日本語化の残り

**Files:**
- Modify:
  - `src/features/history/components/history-graphs.tsx`
  - `src/components/app-shell/app-sidebar.tsx`（＋`app-shell.test.tsx`）
  - `src/features/i18n/messages/{ja,en}.ts`
  - そのほか grep で見つかった箇所

**Interfaces:** なし（文言キーの追加と置き換えだけ）

- [ ] **Step 1: 失敗するテストを書く**
  - `history-graphs.test.tsx` で次を確かめる（ja で描画する）。
    - 選択肢が「体重」「体脂肪率」「身長」「BMI」「からだの調子」「こころの調子」になっている。
    - 期間ボタンが「7日」「30日」「90日」「全期間」になっている。
    - 読み込み中に「読み込み中…」と出る。
  - `history-screen.test.tsx` で、切り替えが「まとめ」「グラフ」になっていることを確かめる。
  - `app-shell.test.tsx` で次を確かめる。
    - PC サイドバーに「今日」と、`nav_*` の日本語が出る。
    - 「Navigation」の文字が無い。
- [ ] **Step 2:** `npx vitest run src/features/history src/components/app-shell` を実行し、FAIL することを確認する。
- [ ] **Step 3: 実装する**
  - 次の英語文言を、すべて `t()` を通すようにする。
    - `METRIC_OPTIONS`
    - 期間ボタン（`history_range_7d/30d/90d/all`）
    - `Loading...`（`common_loading`）
    - サイドバーのラベルと「Navigation」（`nav_group_label`）
  - `ja.ts` の文言を直す。
    - `history_mode_summary` は「まとめ」
    - `history_mode_graphs` は「グラフ」
    - `history_graph_metric_label` は「表示する項目」
  - 最後に、ハードコードされた英語の UI 文言を grep で洗い出して直す。例：`rg -n ">[A-Z][a-z]+[ .]" src --glob "*.tsx"`、`rg -n "\"[A-Z][a-z]+ [a-z]+" src --glob "*.tsx"`。
    - 対象外にするもの：テスト、`English` の表記、`Google Drive`、`aria` 以外の識別子。
  - en 側の訳も付けて、英語モードの表示は保つ。
- [ ] **Step 4:** `npx tsc --noEmit && npm test && npm run lint` を実行し、PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "fix: translate remaining English UI strings"`

---

### Task 12: 書き出し・全削除・旧テーブルの片付け

**Files:**
- Modify:
  - `src/features/settings/csv/history-csv.ts`（＋test）
  - `src/features/settings/components/data-management.tsx`
  - `src/features/storage/app-db.ts`
  - 旧型 `LegacyExerciseLog` と `DailyWellnessEntry` の残りの参照
  - `src/features/storage/daily-wellness.repository.ts`（削除）
  - `src/features/storage/storage.test.ts`

**Interfaces:**
- Produces:
  - `generateExerciseLogsCsv(logs: ExerciseLog[], titles: Map<string,string>)`：列は `date, performedAt, exerciseId, exerciseTitle, result, durationSeconds`。
  - `generateWellnessEntriesCsv(entries: WellnessEntry[])`：列は `date, recordedAt, physicalScore, mentalScore, note`。
  - `generateWatchEventsCsv(events: WatchEvent[], titles)`：列は `date, watchedAt, exerciseId, exerciseTitle`。
  - 時刻の列は `formatTimestampForCsv` で整形する。
  - 設定の「記録をすべて削除」は、`exerciseLogs`、`wellnessEntries`、`watchEvents` を消し、消した id の削除記録を残す。確認文の件数は3つの合計にする。
  - スキーマ v8 で `logs: null`、`dailyWellness: null` にする。

- [ ] **Step 1: 失敗するテストを書く**
  - `history-csv.test.ts` で、上の列名と、`durationSeconds` が `330` で出ることを確かめる。
  - `storage.test.ts` で、全削除のあとに3つのテーブルが空になり、削除記録が件数分あることを確かめる。
- [ ] **Step 2:** `npx vitest run src/features/settings src/features/storage` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 実装する。`grep -rn "LegacyExerciseLog\|DailyWellnessEntry\|dailyWellness\|appDb.logs" src` が 0 件になること。
- [ ] **Step 4:** `npx tsc --noEmit && npm test && npm run lint && npm run build` を実行し、すべて PASS することを確認する。
- [ ] **Step 5:** コミットする。`git commit -m "chore: export new records, clear-all with tombstones, drop legacy tables"`
