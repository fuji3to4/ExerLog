# セルフケア・着用・症状モジュール Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 記録モジュールを3つ追加する。「セルフケア」（スキンケア・運動・その他）、「着用」（弾性着衣・弾性包帯の着けた〜外した）、「症状」（8つの症状の強さ・場所、蜂窩織炎の入院／通院／治療なし、症状なし）。あわせて、画面のない古いセルフケアのデータを取り除く。

**Architecture:**
- 3つとも、写真モジュールと同じく `src/features/modules/<id>/` に `data.ts`（`RecordModuleData`）と `module.tsx`（`RecordModule`）を持つ。登録先は `data-registry.ts` と `registry.ts` に1行ずつで、写真の後ろに足す。
- 集計は、純粋な関数として `summary.ts` に置く。
  - 期間のまとめのカードと履歴の見返し画面の両方が、同じ関数を使う。
  - 履歴の見返し画面は、`RangePresetButtons` で期間を選び、その期間で集計して出す。
- 着用の履歴は、既存の `MetricGraphView` で出す。棒グラフにするため、`GraphSeries` に `chart: "bar"` を足す。
- 古いセルフケアのデータ（`selfCareCatalog`・`dailySelfCareLogs` とその同期設定・リポジトリ・シード）は削除する。Dexie v13 でこれらのテーブルを消し、新しい3つのテーブルを作る。

**Tech Stack:** Next.js 15 (static export)、React 19、TypeScript、Dexie 4、Recharts、Vitest + fake-indexeddb + Testing Library。新しい依存は入れない。

**Spec:** `docs/superpowers/specs/2026-10-28-selfcare-and-symptoms-modules-design.md`
（土台の設計書：`docs/superpowers/specs/2026-10-27-record-modules-foundation-design.md`）

## Global Constraints

- **モジュール id とレジストリ**
  - id は `selfcare`、`compression`、`symptoms`。設定の保存に使うので変えない。
  - レジストリには、`wellness, body, circumference, photo` の後ろに、`selfcare, compression, symptoms` の順で足す。
- **シートのタブ**
  - タブ名は `SelfCare`、`Compression`、`Symptoms`。tombstone の `table` も同じ名前にする。
  - i18n キーは `sync_tab_SelfCare`（セルフケア）、`sync_tab_Compression`（着用）、`sync_tab_Symptoms`（症状）。
- **古いタブ**：`DailySelfCare` と `SelfCareCatalog` は同期の一覧から外す。スプレッドシート上のタブは、読みも書きもせず、消しもしない。
- **Dexie テーブル**：`selfCareRecords`、`compressionRecords`、`symptomRecords`。
  - インデックスは、どれも `"id, date, recordedAt"`。`compressionRecords` だけ `"id, date, recordedAt, kind"` とする。
- **識別子**（固定の英語）
  - セルフケアの項目：`skincare`、`exercise`、`other`
  - 着用の種類：`garment`（弾性着衣）、`bandage`（弾性包帯）
  - 症状（この順）：`edema`、`pain`、`heaviness`、`fatigue`、`stiffness`、`pitting`、`skin`、`cellulitis`
  - 強さ：`1 | 2 | 3`（軽い・中くらい・強い）
  - 場所（この順）：`armRight`、`armLeft`、`legRight`、`legLeft`、`other`
  - 蜂窩織炎の処置：`inpatient`、`outpatient`、`none`
- **日時**
  - すべての記録は `recordedAt` を持つ。着用の記録の `recordedAt` は着けた時刻で、`date` は `recordedAt` の日付にする。
  - 日時を比べるときは `Date.parse` を使う。
- **ゆるさ**
  - 記録を促す表示や、外し忘れの注意書きは作らない。
  - 強さ・場所・分数・メモは、どれも入れなくても保存できる。
- **文言**：画面の文言は、ja と en の両方に置く。
- **確認のコマンド**
  - テストは `npx vitest run <path>`。
  - 最後に `npm run test`、`npm run lint`、`npx tsc --noEmit`、`npm run build` を通す。

## Review Focus

1. **夜をまたぐ着用**：22:00 に着けて翌朝 7:00 に外した記録は、着けた日の記録になり、着用時間は 9時間 と出ること。フォームでは日付も入れられること（時刻だけの欄にしない）。→ Task 4（`wearMinutes`）と Task 6（フォーム）のテスト。
2. **外した時刻が着けた時刻より前**：保存できず、理由が出ること。→ Task 6 のテスト。
3. **着用中の記録がある種類を選んだとき**：「外す」形で開くこと。もう一方の種類に切り替えると、新しい記録の形に変わること。→ Task 6 のテスト。
4. **症状の何も入っていない記録の往復**：強さも場所もない「むくみ」だけの記録が、シートの行から読み戻しても「むくみ」として残ること。症状なしの記録は、症状なしのまま戻ること。→ Task 7 のテスト。
5. **古い DB からの更新**：v12 の DB に `dailySelfCareLogs` の行があっても v13 で開けて、ほかのテーブル（体調など）が残ること。→ Task 1 のテスト。

---

### Task 1: 古いセルフケアを取り除き、新しいテーブル・型・日付の道具を用意する

**Files:**
- Delete:
  - `src/features/catalog/self-care-catalog.ts`
  - `src/features/storage/self-care-catalog.repository.ts`、`.test.ts`
  - `src/features/storage/daily-self-care.repository.ts`
  - `src/features/storage/self-care-storage.test.ts`
- Modify:
  - `src/features/storage/app-db.ts`（v13）
  - `src/features/storage/db-init-provider.tsx`（`seedSelfCareCatalogIfEmpty` を外す）、`db-init-provider.test.tsx`
  - `src/features/sync/sync-config.ts`（`dailySelfCareConfig`、`selfCareCatalogConfig` と、`syncedDbTables` の2テーブルを外す）
  - `src/features/sync/sync-engine.test.ts`（`SelfCareCatalog` に頼る部分）
  - `src/features/modules/data-registry.test.ts`（タブの並び）
  - `src/lib/types.ts`（`SelfCareItem`・`DailySelfCareEntry` を消し、新しい型を足す）
  - `src/features/i18n/messages/ja.ts`、`en.ts`（`sync_tab_DailySelfCare`・`sync_tab_SelfCareCatalog` を消す）
  - `src/lib/date/local-iso.ts`
  - `src/features/modules/period.ts`
- Test:
  - `src/features/storage/storage.test.ts`
  - `src/lib/date/local-iso.test.ts`（なければ作る）
  - `src/features/modules/period.test.ts`

**Interfaces:**
- Produces（`src/lib/types.ts`）:
  ```ts
  export type SelfCareItemId = "skincare" | "exercise" | "other";
  export type SelfCareRecord = { id: string; date: string; recordedAt: string; item: SelfCareItemId; minutes: number | null; note: string; updatedAt: string };
  export type CompressionKind = "garment" | "bandage";
  /** recordedAt is when it was put on; endedAt is null while still worn. */
  export type CompressionRecord = { id: string; date: string; recordedAt: string; kind: CompressionKind; endedAt: string | null; note: string; updatedAt: string };
  export type SymptomId = "edema" | "pain" | "heaviness" | "fatigue" | "stiffness" | "pitting" | "skin" | "cellulitis";
  export type SymptomSeverity = 1 | 2 | 3;
  export type BodySite = "armRight" | "armLeft" | "legRight" | "legLeft" | "other";
  export type CellulitisCare = "inpatient" | "outpatient" | "none";
  export type SymptomEntry = { id: SymptomId; severity: SymptomSeverity | null; sites: BodySite[]; care: CellulitisCare | null };
  /** An empty `symptoms` list means "no symptoms". */
  export type SymptomRecord = { id: string; date: string; recordedAt: string; symptoms: SymptomEntry[]; note: string; updatedAt: string };
  ```
- Produces（`AppDb`）：`selfCareRecords`、`compressionRecords`、`symptomRecords`（`EntityTable<…, "id">`）。
- Produces（`local-iso.ts`）
  - `localIsoFromInput(value: string): string`：`<input type="datetime-local">` の値（`YYYY-MM-DDTHH:mm`）を、その瞬間の端末のオフセット付きのローカル ISO にする（秒は `00`）。
  - `inputValueOfIso(iso: string): string`：`iso.slice(0, 16)` を返す。
- Produces（`period.ts`）
  - `periodDayCount(period: Period): number`：`periodDayKeys` の両端を含む日数。
  - `periodOfDayRange(range: { start: string; end: string }): Period`：開始日の `00:00:00` から終了日の `23:59:59` まで（ローカルのオフセット付き）。

- [ ] **Step 1: 失敗するテストを書く**
  - `storage.test.ts` に `describe("v13 upgrade")` を足す。
    - v12 のスキーマ（今の v12 の stores をそのまま写す）で DB を作り、`dailySelfCareLogs` に1行、`wellnessEntries` に1行入れる。
    - `new AppDb()` で開いたとき、次のとおりになることを確かめる。
      - `verno === 13`
      - テーブル名に `selfCareRecords`、`compressionRecords`、`symptomRecords` が含まれ、`dailySelfCareLogs` と `selfCareCatalog` は含まれない
      - `wellnessEntries.count() === 1`
  - `local-iso.test.ts`
    - `localIsoFromInput("2026-10-28T22:05")` が `/^2026-10-28T22:05:00[+-]\d\d:\d\d$/` に合う。
    - `inputValueOfIso("2026-10-28T22:05:00+09:00") === "2026-10-28T22:05"`。
  - `period.test.ts`
    - `periodDayCount({ start: "2026-10-01T09:00:00+09:00", end: "2026-10-30T08:00:00+09:00" }) === 30`
    - `periodOfDayRange({ start: "2026-10-01", end: "2026-10-03" })` の `start` が `2026-10-01T00:00:00` で始まり、`end` が `2026-10-03T23:59:59` で始まる。
  - `data-registry.test.ts`：`sheetTabs()` の期待値から `"DailySelfCare"` と `"SelfCareCatalog"` を外す。

- [ ] **Step 2: テストを走らせて失敗を確かめる**
  - `npx vitest run src/features/storage/storage.test.ts src/lib/date src/features/modules/period.test.ts src/features/modules/data-registry.test.ts`
  - 期待：v13・新しい関数・タブの並びのテストが FAIL。

- [ ] **Step 3: 実装する**
  - `app-db.ts` に v13 を足す。
    - v12 の stores を元にする。
    - `selfCareCatalog: null`、`dailySelfCareLogs: null` とする。
    - 新しい3テーブルを Global Constraints のインデックスで足す。
  - クラスのプロパティから、古い2つを消して新しい3つを足す。
  - 削除するファイルを消し、参照も取り除く（上記 Files）。
  - 新しい関数を書く。`localIsoFromInput` は、`local-iso.ts` の中の `formatLocalIso(new Date(y, m-1, d, hh, mm))` を使う。

- [ ] **Step 4: テストを走らせて通ることを確かめる**
  - Step 2 と同じコマンドに加え、`npx vitest run src/features/sync src/features/storage` と `npx tsc --noEmit` を走らせる。
  - 期待：すべて PASS で、型のエラーもない。

- [ ] **Step 5: コミット**
  - `git commit -m "refactor(storage): drop placeholder self-care tables; add v13 tables for self-care, compression, symptoms"`

---

### Task 2: セルフケアのデータ層と集計

**Files:**
- Create: `src/features/modules/selfcare/data.ts`、`summary.ts`
- Test: `src/features/modules/selfcare/data.test.ts`、`summary.test.ts`

**Interfaces:**
- Consumes：Task 1 の `SelfCareRecord`、`appDb.selfCareRecords`、`periodDayCount`。
- Produces（`data.ts`）
  - `SELF_CARE_ITEMS: readonly SelfCareItemId[] = ["skincare", "exercise", "other"]`
  - `addSelfCareRecord(input: { date: string; recordedAt: string; item: SelfCareItemId; minutes: number | null; note: string }): Promise<SelfCareRecord>`
  - `updateSelfCareRecord(record: SelfCareRecord): Promise<void>`
  - `deleteSelfCareRecord(id: string): Promise<void>`
  - `listSelfCareInRange(start: string, end: string): Promise<SelfCareRecord[]>`（日付キーで両端を含み、古い順）
  - `selfCareData: RecordModuleData<SelfCareRecord>`
    - `id: "selfcare"`
    - タブ `SelfCare`。headers は `["id","date","item","recordedAt","minutes","note","updatedAt"]`。`minutes` が null のときは空のセルにし、読むときは `nullableNumber` を使う。
    - CSV の `fileName: "selfcare.csv"`、`exportLabelKey: "settings_export_selfcare"`。列は `date, recordedAt, item, minutes, note`（`recordedAt` は `formatTimestampForCsv` で整える）。
- Produces（`summary.ts`）
  - `type SelfCareSummary = { items: { item: SelfCareItemId; days: number; totalMinutes: number | null }[] }`
  - `summarizeSelfCare(records: SelfCareRecord[]): SelfCareSummary | null`
    - 記録が0件なら `null` を返す。
    - `items` は `SELF_CARE_ITEMS` の順に並べ、日数が0の項目は入れない。
    - `days` は、その項目の記録がある `date` の数（同じ日に何件あっても1日と数える）。
    - `totalMinutes` は `exercise` のときだけ、`minutes` が入っている記録の合計を入れる。ほかの項目は `null`。

- [ ] **Step 1: 失敗するテストを書く**
  - `data.test.ts`（`wellness` の data と同じく、`scheduleSync` を mock する）
    - 追加・更新・削除ができる。削除すると、`table: "SelfCare"` の tombstone ができる。
    - `listInPeriod` は、境界の日の範囲外の時刻を除く。
    - `syncConfigs[0]` の `toRow` → `fromRow` で、記録が元のとおりに戻る（`minutes: null` の場合を含む）。
    - CSV の1行目が `date,recordedAt,item,minutes,note` になる。
  - `summary.test.ts`
    - `[]` → `null`
    - スキンケアを同じ日に2件、別の日に1件 → `{ item: "skincare", days: 2, totalMinutes: null }`
    - 運動を30分・分数なし・15分（どれも別の日）→ `{ item: "exercise", days: 3, totalMinutes: 45 }`
    - 記録のない項目は入らない。並びは `skincare, exercise, other`。

- [ ] **Step 2: `npx vitest run src/features/modules/selfcare` を走らせ、FAIL を確かめる**

- [ ] **Step 3: 実装する**：`wellness/data.ts` の形に合わせる（`localIsoNow` で `updatedAt` を入れ、`note.trim()` し、`scheduleSync()` を呼ぶ）。

- [ ] **Step 4: `npx vitest run src/features/modules/selfcare` を走らせ、PASS を確かめる**

- [ ] **Step 5: コミット**：`feat(selfcare): data layer, sync tab and period summary`

---

### Task 3: セルフケアの画面と登録

**Files:**
- Create:
  - `src/features/modules/selfcare/selfcare-form.tsx`
  - `src/features/modules/selfcare/summary-card.tsx`
  - `src/features/modules/selfcare/module.tsx`
  - `src/features/modules/components/range-summary-view.tsx`
- Modify: `data-registry.ts`、`registry.ts`、`data-registry.test.ts`、`ja.ts`、`en.ts`
- Test: `src/features/modules/selfcare/module.test.tsx`、`selfcare-form.test.tsx`

**Interfaces:**
- Consumes：Task 2 のすべて、`periodOfDayRange`、`periodDayCount`。
- Produces（`range-summary-view.tsx`。Task 6 と Task 8 でも使う）
  ```ts
  /** Range buttons (7d/30d/90d/all, default 30d) and `children(period, dayCount)`; dayCount is null for "all". */
  export function RangeSummaryView({ children }: { children(period: Period, dayCount: number | null): ReactNode }): JSX.Element
  ```
- Produces（`summary-card.tsx`）
  - `SelfCareSummaryBody({ summary, dayCount }: { summary: SelfCareSummary | null; dayCount: number | null })`
    - 項目ごとに1行を出す。例（ja）：「スキンケア 12日／30日」「運動 8日／30日・合計 240分」。
    - `dayCount` が null のときは「12日」だけを出す。
    - `summary` が null のときは `<SummaryEmpty />` を出す。
  - `SelfCareSummaryCard({ period })`：`usePeriodSummary` と `periodDayCount(period)` を使う。
- Produces：`selfCareModule: RecordModule<SelfCareRecord>`
  - `labelKey: "module_selfcare_label"`、`descriptionKey: "module_selfcare_description"`、`editTitleKey: "selfcare_edit_title"`
  - アイコンは `HandHeart`（lucide）、色は `#3a9e7e`
- 文言（ja / en）
  - `module_selfcare_label`：セルフケア / Self-care
  - `module_selfcare_description`：スキンケア・運動など / Skin care, exercise and more
  - `selfcare_edit_title`：セルフケアの記録を編集 / Edit self-care
  - `selfcare_item_skincare`：スキンケア / Skin care
  - `selfcare_item_exercise`：運動 / Exercise
  - `selfcare_item_other`：その他 / Other
  - `selfcare_minutes`：分数 / Minutes
  - `selfcare_minutes_value`：{m}分 / {m} min
  - `period_days_of`：{days}日／{total}日 / {days} of {total} days
  - `period_days`：{days}日 / {days} days
  - `period_total_minutes`：合計 {m}分 / {m} min in total
  - `settings_export_selfcare`：セルフケア / Self-care
  - `sync_tab_SelfCare`：セルフケア / Self-care

- [ ] **Step 1: 失敗するテストを書く**
  - `selfcare-form.test.tsx`（`renderWithLanguage`、ja）
    - 初めは「スキンケア」が選ばれていて、分数の欄はない。
    - 「運動」を選ぶと、分数の欄が出る。
    - 30 を入れて保存すると、`item: "exercise", minutes: 30` の記録が1件できる。
    - 「その他」を選んで、メモを空のまま保存できる。
    - 項目は `role="radio"` の3つのボタンにする。
  - `module.test.tsx`
    - `AddRecordMenu` の5番目が「セルフケア」で、それを開くとダイアログのタイトルが「セルフケアを記録」になる（`photo/module.test.tsx` の形）。
    - `TimelineCard` に `{ item: "exercise", minutes: 30, note: "散歩" }` を渡すと、「運動 30分」と「散歩」が出る。
    - `{ item: "other", note: "リンパドレナージ" }` を渡すと、「その他：リンパドレナージ」が1行で出て、メモの行は重ねて出さない。
    - `HistoryView`：今日のスキンケアを1件入れて描くと、初期の30日で「スキンケア 1日／30日」が出る。
  - `data-registry.test.ts`
    - id の並びに `selfcare` を足す。
    - タブの並びに `SelfCare` を足す（`PhotoFiles` の後ろ）。
  - `photo/module.test.tsx` の「メニューの項目数」の期待値を、モジュールの数に合わせて直す。Task 6 と Task 8 でも同じように直す。

- [ ] **Step 2: `npx vitest run src/features/modules` を走らせ、FAIL を確かめる**

- [ ] **Step 3: 実装する**
  - フォームは `WellnessForm` の形に合わせる（`TimeField`、メモ、`TimelineDialogFooter`、`useSaveAndClose`）。
  - 分数の欄は `type="number"`、`min=1`、`inputMode="numeric"`。空なら `null` として保存する。
  - `HistoryView` は `<RangeSummaryView>{(period, dayCount) => <selfcare の集計を period で読み込んで SelfCareSummaryBody に渡す/>}</RangeSummaryView>` の形にする。読み込みには `usePeriodSummary` を使う。
  - 登録は、2つのレジストリに1行ずつ足す。

- [ ] **Step 4: `npx vitest run src/features/modules src/features/history` を走らせ、PASS を確かめる**

- [ ] **Step 5: コミット**：`feat(selfcare): form, timeline card, history and summary; register module`

---

### Task 4: 着用のデータ層と集計

**Files:**
- Create: `src/features/modules/compression/data.ts`、`summary.ts`
- Test: `src/features/modules/compression/data.test.ts`、`summary.test.ts`

**Interfaces:**
- Consumes：Task 1 の `CompressionRecord`、`appDb.compressionRecords`。
- Produces（`data.ts`）
  - `COMPRESSION_KINDS: readonly CompressionKind[] = ["garment", "bandage"]`
  - `addCompressionRecord(input: { kind: CompressionKind; recordedAt: string; endedAt: string | null; note: string }): Promise<CompressionRecord>`
    - `date` は `recordedAt.slice(0, 10)` で決める。
  - `updateCompressionRecord(record: CompressionRecord): Promise<void>`
    - `date` を `recordedAt` から計算し直す。
  - `deleteCompressionRecord(id: string): Promise<void>`
  - `findOpenCompressionRecord(kind: CompressionKind): Promise<CompressionRecord | undefined>`
    - `endedAt === null` の記録のうち、`recordedAt` が一番新しいものを返す。
  - `listCompressionInRange(start: string, end: string): Promise<CompressionRecord[]>`
  - `compressionData: RecordModuleData<CompressionRecord>`
    - `id: "compression"`
    - タブ `Compression`。headers は `["id","date","kind","recordedAt","endedAt","note","updatedAt"]`。`endedAt` が null のときは空のセルにする。
    - CSV の `fileName: "compression.csv"`、`exportLabelKey: "settings_export_compression"`。列は `date, kind, startedAt, endedAt, minutes, note`。`minutes` は着用時間で、着用中なら空にする。
- Produces（`summary.ts`）
  - `wearMinutes(record: CompressionRecord): number | null`
    - 外した時刻と着けた時刻の差を、`Date.parse` を使って分で出す（四捨五入）。
    - `endedAt` が null なら `null` を返す。
  - `type CompressionSummary = { kinds: { kind: CompressionKind; days: number; averageMinutes: number | null }[] }`
  - `summarizeCompression(records: CompressionRecord[]): CompressionSummary | null`
    - 記録が0件なら `null` を返す。
    - `days` は、その種類の記録がある `date` の数（着用中の記録も含む）。
    - `averageMinutes` は「外した時刻がある記録の合計の分 ÷ そういう記録がある日数」を四捨五入したもの。そういう記録がなければ `null`。
    - 記録のない種類は入れない。
  - `dailyWearHours(records: CompressionRecord[], kind: CompressionKind): { date: string; hours: number }[]`
    - 日ごとの合計を、時間・小数1桁で出す。外した時刻がある記録だけを数え、日付の古い順に並べる。
  - `formatWearMinutes(minutes: number, language: Language): string`
    - ja は「13時間20分」。60分未満は「45分」、ちょうどのときは「13時間」。
    - en は「13h 20m」「45m」「13h」。

- [ ] **Step 1: 失敗するテストを書く**
  - `summary.test.ts`
    - `wearMinutes`：`2026-10-28T22:00:00+09:00` 〜 `2026-10-29T07:00:00+09:00` が `540` になる（Review Focus 1）。`endedAt: null` なら `null` になる。
    - `summarizeCompression`：弾性着衣が、10/1 に 8h と 2h の2件、10/2 に 10h の1件、10/3 に着用中の1件のとき、`{ kind: "garment", days: 3, averageMinutes: 600 }` になる。
    - `dailyWearHours`：同じ記録から `[{date:"2026-10-01",hours:10},{date:"2026-10-02",hours:10}]` になる。
    - `formatWearMinutes`：800 → ja「13時間20分」、en「13h 20m」。45 → ja「45分」。780 → ja「13時間」。
  - `data.test.ts`
    - 22:00 に着けた記録の `date` が、着けた日になる。
    - `findOpenCompressionRecord("garment")`：着用中の記録が2件あれば新しいほうを返す。弾性包帯の着用中の記録は返さない。
    - 削除すると、`table: "Compression"` の tombstone ができる。
    - `toRow` → `fromRow` で、`endedAt: null` の記録が元のとおりに戻る。

- [ ] **Step 2: `npx vitest run src/features/modules/compression` を走らせ、FAIL を確かめる**
- [ ] **Step 3: 実装する**（Task 2 と同じ形）
- [ ] **Step 4: `npx vitest run src/features/modules/compression` を走らせ、PASS を確かめる**
- [ ] **Step 5: コミット**：`feat(compression): data layer, wear-time math and period summary`

---

### Task 5: 履歴のグラフに棒グラフを足す

**Files:**
- Modify: `src/features/history/components/metric-graph-view.tsx`、`history-chart.tsx`
- Test: `src/features/history/components/history-chart.test.tsx`

**Interfaces:**
- Produces：`GraphSeries` に、任意の `chart?: "area" | "bar"` を足す（既定は `"area"`）。
  - `"bar"` のとき、`HistoryChart` は Recharts の `BarChart` と `Bar` で描く。色は既存の `#2563eb` を使う。
  - `"bar"` のとき、ツールチップの日時は `M/D` だけにして、時刻は出さない。
  - `"area"` のときの見た目は今のまま変えない。

- [ ] **Step 1: 失敗するテストを書く**
  - `history-chart.test.tsx` に足す（既存のテストが Recharts の描画をどう確かめているかに合わせる）。
    - `chart: "bar"` の series を描くと、`.recharts-bar` が出て、`.recharts-area` は出ない。
    - `formatPointTime` とは別に、`formatPointDay("2026-10-05T12:00:00+09:00") === "10/5"` を export してテストする。
- [ ] **Step 2: `npx vitest run src/features/history` を走らせ、FAIL を確かめる**
- [ ] **Step 3: 実装する**
- [ ] **Step 4: `npx vitest run src/features/history` を走らせ、PASS を確かめる（既存のグラフのテストもすべて通ること）**
- [ ] **Step 5: コミット**：`feat(history): bar variant of the metric chart`

---

### Task 6: 着用の画面と登録

**Files:**
- Create:
  - `src/features/modules/compression/compression-form.tsx`
  - `src/features/modules/compression/summary-card.tsx`
  - `src/features/modules/compression/module.tsx`
- Modify: `data-registry.ts`、`registry.ts`、`data-registry.test.ts`、`photo/module.test.tsx`、`ja.ts`、`en.ts`
- Test: `src/features/modules/compression/compression-form.test.tsx`、`module.test.tsx`

**Interfaces:**
- Consumes：Task 4 のすべて、Task 5 の `chart: "bar"`、Task 1 の `localIsoFromInput` と `inputValueOfIso`。
- Produces：`compressionModule: RecordModule<CompressionRecord>`
  - `labelKey: "module_compression_label"`、`descriptionKey: "module_compression_description"`、`editTitleKey: "compression_edit_title"`
  - アイコンは `Shirt`（lucide）、色は `#5b7fd6`
- フォームの動き（`CompressionForm`。`RecordFormProps<CompressionRecord>`）
  - **編集**（`record` がある）：種類、着けた日時、外した日時（空にもできる）、メモ、削除。
  - **新規**（`record` がない）：種類を選ぶ（初期値は `garment`）。種類を選ぶたびに、`findOpenCompressionRecord(kind)` を読む。
    - **着用中の記録がないとき**（新しく着ける形）
      - 着けた日時の初期値は、`localIsoAt(date)` を `inputValueOfIso` にしたもの。
      - 外した日時は空にする。
    - **着用中の記録があるとき**（外す形）
      - 「弾性着衣 8:10〜 着用中」と出す。着けた日が今日でなければ「10/27 22:00〜 着用中」と出す。
      - 外した日時の初期値は今にする。
      - 保存すると、その記録の `endedAt` を更新する。
      - 「新しく着けた記録にする」ボタンで、新しく着ける形に切り替えられる。
  - 日時の欄は、どちらも `<input type="datetime-local">` にする（夜をまたぐため）。保存のときに `localIsoFromInput` で変換する。
  - 外した日時が着けた日時より前のときは、保存できない。欄の下に「外した時刻は着けた時刻より後にしてください」と出す（Review Focus 2）。
- タイムラインのカード
  - 外した記録：「弾性着衣 8:10〜21:30（13時間20分）」。外したのが別の日なら、「〜10/29 7:00」のように日付を付ける。
  - 着用中の記録：「弾性着衣 8:10〜 着用中」。
  - メモがあれば、下の行に出す。
- `HistoryView`
  - `<MetricGraphView metrics={COMPRESSION_GRAPH_METRICS} />` を使う。
  - metric は `garment` と `bandage` の2つで、`labelKey` は `compression_kind_garment` と `compression_kind_bandage`。
  - `load` は `dailyWearHours` を使い、点を `{ at: localIsoAt(date, 正午), value: hours }` で作る。`unit: "h"`、`decimals: 1`、`chart: "bar"`。
- `CompressionSummaryCard`：種類ごとに「弾性着衣 20日／30日・平均 13時間20分」。平均が null なら平均の部分は出さない。
- 文言（ja / en）
  - `module_compression_label`：着用 / Compression
  - `module_compression_description`：弾性着衣・弾性包帯 / Garments and bandages
  - `compression_edit_title`：着用の記録を編集 / Edit compression wear
  - `compression_kind_garment`：弾性着衣 / Compression garment
  - `compression_kind_bandage`：弾性包帯 / Compression bandage
  - `compression_started_at`：着けた時刻 / Put on
  - `compression_ended_at`：外した時刻 / Taken off
  - `compression_wearing`：着用中 / Wearing
  - `compression_start_new`：新しく着けた記録にする / Record a new wear instead
  - `compression_end_before_start`：外した時刻は着けた時刻より後にしてください / Taken off must be after put on
  - `period_average_wear`：平均 {duration} / Avg {duration}
  - `settings_export_compression`：着用 / Compression
  - `sync_tab_Compression`：着用 / Compression

- [ ] **Step 1: 失敗するテストを書く**（`compression-form.test.tsx`、ja）
  - 着用中の記録がないとき：種類が「弾性着衣」で開き、外した時刻が空のまま保存すると、`endedAt: null` の記録が1件できる。
  - 弾性着衣の着用中の記録（8:10）があるとき（Review Focus 3）
    - 「弾性着衣 8:10〜 着用中」が出る。
    - 保存すると、その記録の `endedAt` が埋まり、件数は増えない。
    - 「弾性包帯」に切り替えると、新しく着ける形になる。
    - 「新しく着けた記録にする」を押すと、新しく着ける形になる。
  - 外した時刻を着けた時刻より前にすると、保存ボタンが押せず、注意の文言が出る（Review Focus 2）。
  - 着けた時刻を `2026-10-28T22:00`、外した時刻を `2026-10-29T07:00` で保存すると、`date: "2026-10-28"` になる（Review Focus 1）。
  - `module.test.tsx`
    - メニューの6番目が「着用」になる。
    - カードに「弾性着衣 8:10〜21:30（13時間20分）」と「弾性着衣 8:10〜 着用中」が出る。
    - 期間のまとめのカードに「弾性着衣 1日／30日・平均 …」が出る。
  - `data-registry.test.ts` に、`compression` と `Compression` を足す。

- [ ] **Step 2: `npx vitest run src/features/modules` を走らせ、FAIL を確かめる**
- [ ] **Step 3: 実装する**
- [ ] **Step 4: `npx vitest run src/features/modules src/features/history` を走らせ、PASS を確かめる**
- [ ] **Step 5: コミット**：`feat(compression): form with put-on / take-off modes, timeline card, bar graph; register module`

---

### Task 7: 症状のデータ層・シートの列・集計

**Files:**
- Create: `src/features/modules/symptoms/data.ts`、`columns.ts`、`summary.ts`
- Test: `src/features/modules/symptoms/data.test.ts`、`columns.test.ts`、`summary.test.ts`

**Interfaces:**
- Consumes：Task 1 の型、`appDb.symptomRecords`。
- Produces（`columns.ts`。シートと CSV の両方で使う）
  - `SYMPTOMS: readonly SymptomId[]`、`BODY_SITES: readonly BodySite[]`（Global Constraints の順）
  - `hasSites(id: SymptomId): boolean`：`fatigue` だけ false。
  - `hasSeverity(id: SymptomId): boolean`：`cellulitis` だけ false。
  - `SYMPTOM_COLUMNS: string[]`
    - 症状ごとに `<id>`（あれば `"1"`）を置く。
    - 強さを持つ症状には `<id>_severity`、場所を持つ症状には `<id>_sites`（`|` 区切り、`BODY_SITES` の順）を足す。
    - 最後に `cellulitis_care` を置く。
  - `symptomCells(symptoms: SymptomEntry[]): string[]`：`SYMPTOM_COLUMNS` の順。
  - `parseSymptomCells(row: string[], headers: string[]): SymptomEntry[]`
    - `<id>` の列が `"1"` の症状だけを返す。
    - 知らない場所や処置の値、範囲外の強さは捨てる（強さは null、場所は除く）。
- Produces（`data.ts`）
  - `addSymptomRecord(input: { date: string; recordedAt: string; symptoms: SymptomEntry[]; note: string }): Promise<SymptomRecord>`
    - `symptoms` は `SYMPTOMS` の順、`sites` は `BODY_SITES` の順に並べ直して保存する。
  - `updateSymptomRecord(record: SymptomRecord)`、`deleteSymptomRecord(id: string)`、`listSymptomsInRange(start: string, end: string)`
  - `symptomsData: RecordModuleData<SymptomRecord>`
    - `id: "symptoms"`
    - タブ `Symptoms`。headers は `["id","date","recordedAt","note","updatedAt", ...SYMPTOM_COLUMNS]`。
    - CSV の `fileName: "symptoms.csv"`、`exportLabelKey: "settings_export_symptoms"`。列は `date, recordedAt, note, ...SYMPTOM_COLUMNS`。
- Produces（`summary.ts`）
  ```ts
  export type SymptomsSummary = {
    recordedDays: number;
    /** Days whose every record has no symptoms. */
    noSymptomDays: number;
    symptoms: { id: SymptomId; days: number; maxSeverity: SymptomSeverity | null; sites: BodySite[] }[];
    cellulitis: { days: number; careDays: Record<CellulitisCare, number> } | null;
  };
  export function summarizeSymptoms(records: SymptomRecord[]): SymptomsSummary | null; // null when no records
  ```
  - `symptoms` は `SYMPTOMS` の順に並べ、日数が0の症状は入れない。
  - `sites` は、期間中に出た場所の和集合を `BODY_SITES` の順に並べる。
  - `careDays` は、その処置が記録された日数。1日が複数の処置に入ってもよい。
  - 蜂窩織炎は `symptoms` にも入れる（日数と場所を出すため）。

- [ ] **Step 1: 失敗するテストを書く**
  - `columns.test.ts`（Review Focus 4）
    - 強さも場所もない `[{ id: "edema", severity: null, sites: [], care: null }]` が、`symptomCells` → `parseSymptomCells` で同じ形に戻る。
    - `[]`（症状なし）が `[]` に戻る。
    - `{ id: "cellulitis", severity: null, sites: ["legRight"], care: "outpatient" }` が戻る。
    - `edema_sites` が `"armLeft|bogus"` なら、`sites` は `["armLeft"]` になる。
    - `SYMPTOM_COLUMNS` に `fatigue_sites` と `cellulitis_severity` が含まれない。
  - `summary.test.ts`
    - 10/1 にむくみ（強さ1・左腕）、10/1 にむくみ（強さ3・右腕）、10/2 に症状なし、10/3 に症状なしとむくみ（強さ2）を入れる。
    - このとき、`recordedDays: 3`、`noSymptomDays: 1`、`edema: { days: 2, maxSeverity: 3, sites: ["armRight","armLeft"] }` になる。
    - 蜂窩織炎が、10/5 に通院、10/6 に入院、10/6 に通院のとき、`cellulitis: { days: 2, careDays: { inpatient: 1, outpatient: 2, none: 0 } }` になる。
    - `[]` は `null` になる。
  - `data.test.ts`
    - 保存すると、並び順が `SYMPTOMS` と `BODY_SITES` の順になる。
    - 削除すると、`table: "Symptoms"` の tombstone ができる。
    - `toRow` → `fromRow` で、記録が元のとおりに戻る。

- [ ] **Step 2: `npx vitest run src/features/modules/symptoms` を走らせ、FAIL を確かめる**
- [ ] **Step 3: 実装する**
- [ ] **Step 4: `npx vitest run src/features/modules/symptoms` を走らせ、PASS を確かめる**
- [ ] **Step 5: コミット**：`feat(symptoms): data layer, per-symptom sheet columns and period summary`

---

### Task 8: 症状の画面と登録

**Files:**
- Create:
  - `src/features/modules/symptoms/symptoms-form.tsx`
  - `src/features/modules/symptoms/summary-card.tsx`
  - `src/features/modules/symptoms/module.tsx`
- Modify: `data-registry.ts`、`registry.ts`、`data-registry.test.ts`、`photo/module.test.tsx`、`ja.ts`、`en.ts`
- Test: `src/features/modules/symptoms/symptoms-form.test.tsx`、`module.test.tsx`

**Interfaces:**
- Consumes：Task 7 のすべて、Task 3 の `RangeSummaryView`。
- Produces：`symptomsModule: RecordModule<SymptomRecord>`
  - `labelKey: "module_symptoms_label"`、`descriptionKey: "module_symptoms_description"`、`editTitleKey: "symptoms_edit_title"`
  - アイコンは `Activity`（lucide）、色は `#c2577a`
- `formatSymptomEntry(entry: SymptomEntry, t): string`（`module.tsx` から export）
  - 「むくみ（中・左腕）」「痛み（軽）」「むくみ」「蜂窩織炎（通院・右脚）」のように組み立てる。
  - 場所が2つ以上なら「・」でつなぐ。
- フォーム（`SymptomsForm`）
  - 上から順に、`TimeField`、「症状なし」ボタン、症状のボタン8つ（`aria-pressed`）、メモ、`TimelineDialogFooter` を並べる。
  - 押した症状の下に、次の欄を出す。
    - 強さ：`role="radio"` の3つのボタン。もう一度押すと外れる。
    - 蜂窩織炎の場合は、強さの代わりに処置（入院・通院・治療なし）を出す。同じく、もう一度押すと外れる。
    - 場所：トグルのボタン5つ。`hasSites` が false の症状には出さない。
  - 「症状なし」を押すと、`symptoms: []` ですぐに保存して閉じる。症状を1つでも選んでいる間は、押せないようにする（`disabled`）。
  - 保存ボタンは、症状が1つ以上あるときだけ押せる。
- タイムラインのカード：`formatSymptomEntry` を「、」でつないだ1行を出す。症状が空なら「症状なし」と出す。メモは下の行に出す。
- `SymptomsSummaryBody({ summary })`
  - 1行目：「記録 12日（症状なし 5日）」
  - 症状ごとの行：「むくみ 6日・最大 強・左腕・右腕」
  - 蜂窩織炎の行：「蜂窩織炎 2日（入院 1日・通院 2日）」。0日の処置は出さない。
- `HistoryView`
  - `RangeSummaryView` の中に、`SymptomsSummaryBody` と蜂窩織炎の記録の一覧を出す。
  - 一覧は新しい順で、1行は「10/5 通院・右脚」の形。期間内に蜂窩織炎がなければ、一覧は出さない。
- 文言（ja / en）
  - `module_symptoms_label`：症状 / Symptoms
  - `module_symptoms_description`：むくみ・痛みなどの状態 / Swelling, pain and more
  - `symptoms_edit_title`：症状の記録を編集 / Edit symptoms
  - `symptoms_none`：症状なし / No symptoms
  - 症状：`symptom_edema` むくみ / Swelling、`symptom_pain` 痛み / Pain、`symptom_heaviness` 重だるさ / Heaviness、`symptom_fatigue` 疲れやすさ / Fatigue、`symptom_stiffness` 関節が曲げにくい / Stiff joints、`symptom_pitting` 指で押すとあとが残る（圧痕） / Pitting、`symptom_skin` 皮膚の変化 / Skin changes、`symptom_cellulitis` 蜂窩織炎 / Cellulitis
  - 強さ：`symptom_severity_1` 軽 / Mild、`symptom_severity_2` 中 / Moderate、`symptom_severity_3` 強 / Severe
    - フォームの見出しは `symptom_severity_label`：強さ / Severity
  - 場所：`body_site_armRight` 右腕 / Right arm、`body_site_armLeft` 左腕 / Left arm、`body_site_legRight` 右脚 / Right leg、`body_site_legLeft` 左脚 / Left leg、`body_site_other` その他 / Other
    - フォームの見出しは `symptom_sites_label`：場所 / Location
  - 処置：`cellulitis_care_inpatient` 入院 / Hospitalized、`cellulitis_care_outpatient` 通院 / Outpatient、`cellulitis_care_none` 治療なし / No treatment
    - 見出しは `cellulitis_care_label`：治療 / Treatment
  - まとめ：`period_recorded_days` 記録 {days}日（症状なし {none}日） / Recorded on {days} days ({none} without symptoms)、`period_max_severity` 最大 {severity} / Worst: {severity}
  - `settings_export_symptoms`：症状 / Symptoms
  - `sync_tab_Symptoms`：症状 / Symptoms

- [ ] **Step 1: 失敗するテストを書く**
  - `symptoms-form.test.tsx`（ja）
    - 「症状なし」を押すと、`symptoms: []` の記録が1件できる。
    - 「むくみ」を押すと「症状なし」が disabled になり、強さと場所の欄が出る。
    - 「中」と「左腕」を押して保存すると、`[{ id: "edema", severity: 2, sites: ["armLeft"], care: null }]` になる。
    - 「疲れやすさ」を押しても、場所の欄は出ない。
    - 「蜂窩織炎」を押すと、強さではなく「入院・通院・治療なし」が出る。
    - 症状を何も選んでいなければ、保存ボタンは押せない。
  - `module.test.tsx`
    - メニューの7番目が「症状」になる。
    - `formatSymptomEntry` が上の4つの例のとおりの文字列を返す。
    - カードに「症状なし」が出る。
    - `HistoryView` に蜂窩織炎の記録の一覧が出る。
  - `data-registry.test.ts` に、`symptoms` と `Symptoms` を足す。

- [ ] **Step 2: `npx vitest run src/features/modules` を走らせ、FAIL を確かめる**
- [ ] **Step 3: 実装する**
- [ ] **Step 4: `npx vitest run src/features/modules` を走らせ、PASS を確かめる**
- [ ] **Step 5: コミット**：`feat(symptoms): form, timeline card, history with cellulitis list; register module`

---

### Task 9: 全体の確認

**Files:**
- Modify：失敗したテストや型・lint の指摘があれば、そのファイル。

- [ ] **Step 1**：`npm run test` を走らせる。期待：すべて PASS。
- [ ] **Step 2**：`npx tsc --noEmit` と `npm run lint` を走らせる。期待：エラーなし。
- [ ] **Step 3**：`npm run build` を走らせる。期待：静的書き出しが成功する。
- [ ] **Step 4**：`grep -rn "selfCareCatalog\|dailySelfCareLogs\|DailySelfCareEntry\|SelfCareItem\b" src` を走らせる。期待：`app-db.ts` の v2〜v12 の stores と `storage.test.ts` の古いスキーマのほかに、参照が残っていない。
- [ ] **Step 5**：アプリで動作を確かめる（`npm run dev`、スマートフォンの幅）。
  - 「＋記録する」に3つのモジュールが出る。
  - 着用を「着ける」→「外す」の順に記録すると、タイムラインのカードが「着用中」から時間付きに変わる。
  - 症状なしをワンタップで記録できる。
  - 期間のまとめに3枚のカードが出る。
  - 設定で OFF にすると、メニューから消える。
- [ ] **Step 6**：直したものがあればコミットする。`fix: …`
