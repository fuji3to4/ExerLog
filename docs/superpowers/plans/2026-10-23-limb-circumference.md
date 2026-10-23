# 腕・脚の周径（左右）の記録とグラフ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 腕・脚の周径を左右5部位ずつ時刻付きで記録し、部位ごとに左右2本の線のグラフで「前回との差」と「左右差」を見られるようにする。

**Architecture:**
- **項目の定義**：周径20項目を、既存の `MEASUREMENT_ITEMS` に足す。各項目に `circumference: { limb, site, side }` を持たせる。同期・CSV は今の仕組みのまま列が増える。
- **周径の補助**：`src/features/measurements/circumference.ts` を新しく作る。腕／脚・部位・左右の型、項目の引き方、「前回使った腕／脚」の保存、差の計算と表示をここに集める。
- **画面**：記録画面（`MeasurementForm`）に周径の欄、「腕｜脚」の切り替え、ヘルプを足す。グラフは「周径」を選ぶと、専用の部品（`CircumferenceGraph`）に切り替わる。

**Tech Stack:** Next.js 15 (static export)、React 19、TypeScript、Dexie、Recharts、Vitest + fake-indexeddb + Testing Library

**Spec:** `docs/superpowers/specs/2026-10-23-limb-circumference-design.md`

## Global Constraints

- 新しい依存パッケージは追加しない。
- 画面の文言は `src/features/i18n/messages/{ja,en}.ts` を通す（ja と en の両方に追加する）。
- 周径の項目：単位は `cm`、`decimals: 1`、`min: 5`、`max: 150`、`showInGraph: false`。
- 部位の順番（腕）：手のひら、手首、肘下5cm、肘上10cm、腋窩。
- 部位の順番（脚）：足の甲、足首、膝下5cm（ふくらはぎ）、膝上10cm、脚のつけ根。
- 左右の並び：入力欄も凡例も「左｜右」の順。
- 項目の id は `<limb><Site><Side>` のキャメルケースにする（例 `armBelowElbowRight`）。一度決めたら変えない。
- 前回の値は入力欄に薄く表示する（placeholder）だけにする。入力しなかった欄は保存しない。
- 「前回使った腕／脚」は、記録画面とグラフで、localStorage の同じキー `exerlog-circumference-limb` を共有する。初めは `arm`。読み書きの失敗は無視する。
- 手帳（`docs/memo/selfcare_6.pdf`）のイラストや写真は使わない。ヘルプの図は新しく描いた SVG にする。
- 合格の条件：
  - `npx tsc --noEmit` でエラーがない。
  - `npm test` がすべて通る（開始時に一度実行し、既に失敗しているテストがあれば記録しておく）。

## Review Focus

1. **表示していない側の正しくない値**：脚を表示中に、腕の欄に範囲外の値が残っている。この場合は保存できず、切り替えの「腕」に ⚠ が付く。→ Task 3 のテスト。
2. **修正で開いたときの腕／脚**：前回使ったのが「腕」でも、脚の値だけを持つ記録を修正するときは「脚」で開く。→ Task 3 のテスト。
3. **左右の片方だけの記録**：左右差を出さず、別々の記録の値を組み合わせない。→ Task 5 のテスト。
4. **グラフの範囲より前の記録**：「前回との差」の計算に含める。→ Task 5 のテスト。
5. **差の小数の誤差**：24.5 − 24.2 が `+0.30000000000000071` ではなく「+0.3」と表示される。差が 0 のときは「±0.0」。→ Task 5 のテスト。

---

## File Structure

| ファイル | 役割 |
| --- | --- |
| `src/features/measurements/circumference.ts`（新規） | 型、部位の一覧、項目 id、項目の引き方、腕／脚の保存、件数の数え方、差の計算と書式 |
| `src/features/measurements/circumference.test.ts`（新規） | 上のテスト |
| `src/features/measurements/measurement-items.ts` | `MeasurementItem` に `circumference?` を足す。20項目を追加。タイムラインの1行に周径の件数を入れる |
| `src/features/timeline/components/circumference-fields.tsx`（新規） | 記録画面の周径欄（腕｜脚の切り替え、左｜右の2列、？ボタン） |
| `src/features/timeline/components/circumference-help-dialog.tsx`（新規） | 測定位置のヘルプ |
| `src/features/timeline/components/measurement-form.tsx` | 周径欄を組み込む。基本項目の欄は周径以外だけにする |
| `src/features/history/history-graph-query.ts` | `buildCircumferenceSeries` を追加 |
| `src/features/history/components/circumference-graph.tsx`（新規） | 腕｜脚、部位ボタン、左右2本の線のグラフ、吹き出し |
| `src/features/history/components/history-graphs.tsx` | 選択肢に「周径」を足し、選ばれたら `CircumferenceGraph` を出す |

---

### Task 1: 周径の項目定義と補助関数

**Files:**
- Create: `src/features/measurements/circumference.ts`
- Create: `src/features/measurements/circumference.test.ts`
- Modify: `src/features/measurements/measurement-items.ts`
- Modify: `src/features/measurements/measurement-items.test.ts`（「items are weight, bodyFat, height in that order」を更新）
- Modify: `src/features/measurements/add-item.integration.test.tsx`（入力欄の数を 4 → 4 + 腕10 に更新）
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts`

**Interfaces:**
- Produces（`circumference.ts`）:
  ```ts
  export type Limb = "arm" | "leg";
  export type Side = "left" | "right";
  export type CircumferenceSite =
    | "palm" | "wrist" | "belowElbow" | "aboveElbow" | "axilla"
    | "instep" | "ankle" | "belowKnee" | "aboveKnee" | "groin";
  export type CircumferencePlace = { limb: Limb; site: CircumferenceSite; side: Side };
  export const LIMBS: readonly Limb[];                       // ["arm", "leg"]
  export const SIDES: readonly Side[];                       // ["left", "right"]
  export const CIRCUMFERENCE_SITES: Record<Limb, readonly CircumferenceSite[]>;
  export function circumferenceItemId(limb: Limb, site: CircumferenceSite, side: Side): string;
  export function findCircumferenceItem(limb: Limb, site: CircumferenceSite, side: Side): MeasurementItem; // MEASUREMENT_ITEMS から引く
  export function isCircumferenceItem(item: MeasurementItem): boolean;
  export function countCircumferenceValues(values: Record<string, number>, limb: Limb): number;
  export const CIRCUMFERENCE_LIMB_STORAGE_KEY = "exerlog-circumference-limb";
  export function readCircumferenceLimb(): Limb;   // 失敗・未保存・不正な値は "arm"
  export function writeCircumferenceLimb(limb: Limb): void; // 失敗は無視
  export const SIDE_COLORS: Record<Side, string>;  // { left: "#2f7fc1", right: "#d9534f" }。入力欄の見出しとグラフで共有
  ```
- Produces（i18n キー）:
  - `circumference_limb_arm`（腕／Arm）、`circumference_limb_leg`（脚／Leg）
  - `circumference_side_left`（左／Left）、`circumference_side_right`（右／Right）
  - `circumference_site_<site>`：10部位の名前
    - ja：手のひら、手首、肘下5cm、肘上10cm、腋窩、足の甲、足首、膝下5cm（ふくらはぎ）、膝上10cm、脚のつけ根
    - en：Palm、Wrist、5 cm below elbow、10 cm above elbow、Armpit、Instep、Ankle、5 cm below knee (calf)、10 cm above knee、Groin
  - 20項目それぞれの `labelKey`：`measurement_item_<id>`
    - 値は「{部位} {左右}」。例 ja「肘下5cm 右」、en「5 cm below elbow, right」
    - 入力欄の accessible name と、グラフ以外の表示に使う

- [ ] **Step 1: 失敗するテストを書く**（`circumference.test.ts`）

```ts
test("defines 20 circumference items after the basic ones, arm before leg, left before right", () => {
  const ids = MEASUREMENT_ITEMS.map((item) => item.id);
  expect(ids.slice(0, 3)).toEqual(["weight", "bodyFat", "height"]);
  expect(ids.slice(3, 7)).toEqual(["armPalmLeft", "armPalmRight", "armWristLeft", "armWristRight"]);
  expect(ids.slice(-2)).toEqual(["legGroinLeft", "legGroinRight"]);
  expect(ids).toHaveLength(23);
});

test("every circumference item is cm, 1 decimal, 5–150, not in the plain graph list", () => {
  const items = MEASUREMENT_ITEMS.filter(isCircumferenceItem);
  expect(items).toHaveLength(20);
  for (const item of items) {
    expect(item).toMatchObject({ unit: "cm", decimals: 1, min: 5, max: 150, showInGraph: false });
  }
});

test("findCircumferenceItem and the ja label", () => {
  const item = findCircumferenceItem("arm", "belowElbow", "right");
  expect(item.id).toBe("armBelowElbowRight");
  expect(getMessages("ja")[item.labelKey]).toBe("肘下5cm 右");
});

test("countCircumferenceValues counts only that limb", () => {
  expect(countCircumferenceValues({ weight: 60, armPalmLeft: 18, armPalmRight: 19, legAnkleLeft: 21 }, "arm")).toBe(2);
  expect(countCircumferenceValues({ weight: 60 }, "leg")).toBe(0);
});

test("limb storage defaults to arm and survives a throwing storage", () => {
  window.localStorage.clear();
  expect(readCircumferenceLimb()).toBe("arm");
  writeCircumferenceLimb("leg");
  expect(window.localStorage.getItem("exerlog-circumference-limb")).toBe("leg");
  expect(readCircumferenceLimb()).toBe("leg");
  window.localStorage.setItem("exerlog-circumference-limb", "tail");
  expect(readCircumferenceLimb()).toBe("arm");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readCircumferenceLimb()).toBe("arm");
});

test("CSV and the sync tab get a column for every circumference id", () => {
  const header = generateMeasurementsCsv([]).split("\n")[0];
  expect(header).toContain("armPalmLeft");
  expect(header).toContain("legGroinRight");
  // TABLE_SYNC_CONFIGS の Measurements の列にも armPalmLeft と legGroinRight が含まれることを確かめる
});
```

最後のテストの同期の列の確かめ方は、`add-item.integration.test.tsx` の (d) と同じ方法を使う。

- [ ] **Step 2: テストを実行し、失敗することを確かめる**

Run: `npx vitest run src/features/measurements`
Expected: FAIL（`./circumference` が見つからない）

- [ ] **Step 3: 実装する**
  - `MeasurementItem` に `circumference?: CircumferencePlace` を足す（型は `circumference.ts` から import する）。
  - 20項目は手で書き並べず、`LIMBS` × `CIRCUMFERENCE_SITES[limb]` × `SIDES` から作る。並びは「腕→脚、部位の順、左→右」。
  - `circumference.ts` は `measurement-items.ts` の型を import し、`measurement-items.ts` は `circumference.ts` の定数を import する。循環が問題になるなら、型と定数を `circumference.ts` 側に置き、`measurement-items.ts` だけが値を読む向きにする。
  - i18n キーを ja・en に足す。
  - `measurement-items.test.ts` の並び順のテストを「先頭3件が weight, bodyFat, height」に直す。
  - `add-item.integration.test.tsx` (a) の `toHaveLength(4)` を `toHaveLength(4 + 10)` に直し、「腕の周径の10欄」とコメントを付ける。

- [ ] **Step 4: テストを実行し、通ることを確かめる**

Run: `npx vitest run src/features/measurements src/features/settings src/features/sync && npx tsc --noEmit`
Expected: PASS、型エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/features/measurements src/features/i18n/messages
git commit -m "feat: define left/right arm and leg circumference items"
```

---

### Task 2: タイムラインの1行に周径の件数を出す

**Files:**
- Modify: `src/features/measurements/measurement-items.ts`（`formatMeasurementSummary`）
- Modify: `src/features/measurements/measurement-items.test.ts`
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts`

**Interfaces:**
- Consumes: `isCircumferenceItem`, `countCircumferenceValues`, `LIMBS`（Task 1）
- Produces: i18n キー `circumference_summary_arm`（ja「腕の周径 {count}か所」、en「Arm circumference ({count})」）と `circumference_summary_leg`（ja「脚の周径 {count}か所」、en「Leg circumference ({count})」）

- [ ] **Step 1: 失敗するテストを書く**

```ts
test("formatMeasurementSummary lists basic items, then arm and leg circumference counts", () => {
  const messages = getMessages("ja");
  const t = (key: keyof typeof messages, params?: Record<string, string | number>) =>
    messages[key].replace(/\{(\w+)\}/g, (_, name) => String(params?.[name]));
  const values = { weight: 60.2, legAnkleLeft: 21, armPalmLeft: 18, armPalmRight: 19 };
  expect(formatMeasurementSummary({ ...baseRecord, values }, t)).toBe("体重 60.2kg・腕の周径 2か所・脚の周径 1か所");
  expect(formatMeasurementSummary({ ...baseRecord, values: { legGroinRight: 53.4 } }, t)).toBe("脚の周径 1か所");
});
```

`baseRecord` は、既存テストの `record` と同じ形の `MeasurementRecord` にする。`t` は、テストで既に使っている書き方があればそれに合わせる。

- [ ] **Step 2: テストを実行し、失敗することを確かめる**

Run: `npx vitest run src/features/measurements/measurement-items.test.ts`
Expected: FAIL（周径の値が「肘下5cm 右 …」のように列挙される、または欠ける）

- [ ] **Step 3: 実装する**
  - 周径以外の項目は今までどおり「名前 値単位」で並べる。
  - そのあとに、件数が0でない limb を腕→脚の順で `circumference_summary_<limb>` を使って足す。
  - 区切りは「・」のまま。

- [ ] **Step 4: テストを実行し、通ることを確かめる**

Run: `npx vitest run src/features/measurements src/features/timeline`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/measurements src/features/i18n/messages
git commit -m "feat: show circumference counts in the timeline row"
```

---

### Task 3: 記録画面の周径欄（腕｜脚の切り替え、左｜右）

**Files:**
- Create: `src/features/timeline/components/circumference-fields.tsx`
- Modify: `src/features/timeline/components/measurement-form.tsx`
- Test: `src/features/timeline/components/record-dialog.test.tsx`（周径の describe を追加）
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts`

**Interfaces:**
- Consumes: Task 1 のすべて。`measurement-form.tsx` の `Draft`、`parseDraft`、`MeasurementField` の入力の作り
- Produces:
  ```ts
  // circumference-fields.tsx
  export function CircumferenceFields(props: {
    limb: Limb;
    onLimbChange(limb: Limb): void;
    invalidLimbs: ReadonlySet<Limb>;            // ⚠ を付ける側
    renderInput(item: MeasurementItem): ReactNode; // 1欄分の <input>。MeasurementForm が渡す
    onHelp(): void;
  }): JSX.Element;
  ```
- i18n キー：
  - `circumference_heading`（ja「周径（cm）」、en「Circumference (cm)」）
  - `circumference_limb_label`（ja「測る部位」、en「Limb」）。切り替えの accessible name に使う
  - `circumference_help_open`（ja「測る位置の説明」、en「Where to measure」）。？ボタンの aria-label に使う
  - `circumference_limb_has_error`（ja「{limb}に正しくない値があります」、en「{limb} has an invalid value」）。⚠ の説明に使う

`MeasurementForm` の変更：
- 基本の欄（体重・体脂肪率・身長）は、`MEASUREMENT_ITEMS.filter((item) => !isCircumferenceItem(item))` だけを並べる。
- その下に `CircumferenceFields` を置く。
- `drafts` と `parsed` は今までどおり全項目を持つ。表示していない側の下書きも残し、保存の値の組み立てと `canSave` の判定にも含める。こうすれば、切り替えても値は消えず、隠れた側の正しくない値でも保存できない。
- 開いたときの `limb`：
  - 修正のときは、記録に腕の値があれば腕、なければ脚の値があれば脚、どちらもなければ `readCircumferenceLimb()`。
  - 新規のときは `readCircumferenceLimb()`。
- 切り替えると `writeCircumferenceLimb` を呼ぶ。
- `invalidLimbs` は、`parsed` が `invalid` の周径項目の limb の集合にする。
- 各周径欄の placeholder は、基本の欄と同じく `measurement_previous`。accessible name は項目の `labelKey`（「肘下5cm 右」）。
- 列見出しの「左」「右」には、`SIDE_COLORS`（Task 1）の色を付ける。
- 切り替えは、既存の `KindTabs` と同じ見た目と操作（`role="tab"`、左右キー）にする。⚠ は、その tab の文字の後ろに付け、`aria-label` に `circumference_limb_has_error` を入れる。
- ？ボタンは `onHelp` を呼ぶ。この Task では、ヘルプは state を持つだけでよい（中身は Task 4）。

- [ ] **Step 1: 失敗するテストを書く**（`record-dialog.test.tsx` に `describe("circumference")` を追加）

```ts
it("opens on the remembered limb and shows left/right fields for its five sites only", async () => {
  window.localStorage.setItem("exerlog-circumference-limb", "leg");
  renderDialog();
  fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
  expect(screen.getByRole("tab", { name: "脚" }).getAttribute("aria-selected")).toBe("true");
  expect(input("足首 左")).toBeTruthy();
  expect(within(screen.getByRole("dialog")).queryByLabelText("手首 左")).toBeNull();
});

it("keeps arm values when switching to leg and saves both in one record", async () => {
  const { onSaved } = renderDialog();
  fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
  fireEvent.change(input("肘下5cm 右"), { target: { value: "24.5" } });
  fireEvent.click(screen.getByRole("tab", { name: "脚" }));
  fireEvent.change(input("足首 左"), { target: { value: "21.0" } });
  fireEvent.click(screen.getByRole("tab", { name: "腕" }));
  expect(input("肘下5cm 右").value).toBe("24.5");
  fireEvent.click(saveButton());
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
  expect((await onlyRecord()).values).toEqual({ armBelowElbowRight: 24.5, legAnkleLeft: 21 });
  expect(window.localStorage.getItem("exerlog-circumference-limb")).toBe("arm");
});

it("blocks saving and marks the hidden limb when it holds an invalid value", async () => {
  renderDialog();
  fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
  fireEvent.change(input("手首 左"), { target: { value: "200" } });
  fireEvent.click(screen.getByRole("tab", { name: "脚" }));
  fireEvent.change(input("足首 左"), { target: { value: "21.0" } });
  expect(saveButton().disabled).toBe(true);
  expect(screen.getByRole("tab", { name: /腕/ }).textContent).toContain("⚠");
});

it("shows the previous value of each side as a placeholder", async () => {
  await addMeasurement({
    date: "2026-10-19",
    recordedAt: localIsoAt("2026-10-19", new Date(2026, 9, 19, 21, 0, 0)),
    values: { armBelowElbowRight: 24.5 },
    note: "",
  });
  renderDialog();
  fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
  await waitFor(() => expect(input("肘下5cm 右").placeholder).toBe("前回 24.5"));
  expect(input("肘下5cm 左").placeholder).toBe("");
});

it("opens an edited leg-only record on 脚 even when 腕 was remembered", async () => {
  const record = await addMeasurement({
    date: DATE,
    recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 6, 0, 0)),
    values: { legAnkleLeft: 21 },
    note: "",
  });
  window.localStorage.setItem("exerlog-circumference-limb", "arm");
  renderDialog({ editing: { kind: "measurement", record } });
  expect((await screen.findByRole("tab", { name: "脚" })).getAttribute("aria-selected")).toBe("true");
  expect(input("足首 左").value).toBe("21");
});
```

- [ ] **Step 2: テストを実行し、失敗することを確かめる**

Run: `npx vitest run src/features/timeline/components/record-dialog.test.tsx`
Expected: 新しい5件が FAIL。既存のテストは PASS のまま。

- [ ] **Step 3: 上の「`MeasurementForm` の変更」と `CircumferenceFields` を実装する**

- [ ] **Step 4: テストを実行し、通ることを確かめる**

Run: `npx vitest run src/features/timeline src/features/measurements && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/timeline src/features/measurements src/features/i18n/messages
git commit -m "feat: record left/right circumference with an arm/leg switch"
```

---

### Task 4: 測定位置のヘルプ

**Files:**
- Create: `src/features/timeline/components/circumference-help-dialog.tsx`
- Modify: `src/features/timeline/components/measurement-form.tsx`（Task 3 の `onHelp` から開く）
- Test: `src/features/timeline/components/record-dialog.test.tsx`
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts`

**Interfaces:**
- Consumes: `Limb`, `CIRCUMFERENCE_SITES`（Task 1）、`@/components/ui/dialog`
- Produces: `export function CircumferenceHelpDialog(props: { open: boolean; onOpenChange(open: boolean): void; limb: Limb }): JSX.Element`

文言（ja。en は同じ意味で書く）。キー名は作る人が決める：
- タイトル：「腕の測り方」／「脚の測り方」
- 共通：「測る時刻は、起床後か就寝前など、なるべくそろえましょう。」
- 手のひら：「こぶしを握ったときに4つ並ぶ骨の出っ張りを通る周り。」
- 手首：「手首の周り。」
- 肘下5cm／肘上10cm：「肘から5cm下の周り。」／「肘から10cm上の周り。」
- 腋窩：「わきの下を一周する位置。」
- 足の甲：「親指の骨の根元で土踏まずのアーチが始まる点から、小指側の出っ張りの手前までを通る周り。」
- 足首：「足首の周り。」
- 膝下5cm／膝上10cm：「膝のお皿から5cm下（ふくらはぎ）の周り。」／「膝のお皿から10cm上の周り。」
- 脚のつけ根：「脚のつけ根を一周する位置。」
- 注記：「弾性着衣（スリーブ・ストッキング）を選ぶときは、測る位置がメーカーごとに違います。各メーカーのカタログを確認してください。」

図：腕（または脚）の簡単な線画のインライン SVG。5か所に、上の一覧と同じ番号（❶〜❺）の目印の線を引く。色はテーマのトークン（`currentColor` など）を使い、ダークテーマでも見えるようにする。`role="img"` と、`aria-label`（「腕の測る位置 1〜5」など）を付ける。

- [ ] **Step 1: 失敗するテストを書く**

```ts
it("opens the measuring help for the selected limb", async () => {
  window.localStorage.setItem("exerlog-circumference-limb", "leg");
  renderDialog();
  fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
  fireEvent.click(screen.getByRole("button", { name: "測る位置の説明" }));
  const help = await screen.findByRole("dialog", { name: "脚の測り方" });
  expect(within(help).getByText(/土踏まずのアーチ/)).toBeTruthy();
  expect(within(help).getByRole("img")).toBeTruthy();
  expect(within(help).queryByText(/こぶしを握った/)).toBeNull();
});
```

- [ ] **Step 2: テストを実行し、失敗することを確かめる**

Run: `npx vitest run src/features/timeline/components/record-dialog.test.tsx -t "measuring help"`
Expected: FAIL

- [ ] **Step 3: `CircumferenceHelpDialog` を実装し、`MeasurementForm` から開く**（ダイアログの中にダイアログを重ねる形）

- [ ] **Step 4: テストを実行し、通ることを確かめる**

Run: `npx vitest run src/features/timeline && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/timeline src/features/i18n/messages
git commit -m "feat: add circumference measuring help"
```

---

### Task 5: グラフ用のデータ（前回との差・左右差）

**Files:**
- Modify: `src/features/measurements/circumference.ts`
- Modify: `src/features/measurements/circumference.test.ts`
- Modify: `src/features/history/history-graph-query.ts`
- Test: `src/features/history/history-graph-query.test.ts`

**Interfaces:**
- Produces（`circumference.ts`）:
  ```ts
  export type SideReading = { value: number; delta: number | null }; // delta：同じ部位・同じ側の一つ前の記録との差。前回がなければ null
  export type CircumferencePoint = { at: string; left?: SideReading; right?: SideReading };
  /** records は時刻の順でなくてよい。rangeStart より前の記録は「前回」にだけ使い、点にはしない。 */
  export function buildCircumferencePoints(
    records: MeasurementRecord[], limb: Limb, site: CircumferenceSite, rangeStart: string,
  ): CircumferencePoint[];
  /** "+0.3" / "−0.2"（U+2212）/ "±0.0"。decimals 桁に丸めてから符号を決める。 */
  export function formatDelta(delta: number, decimals: number): string;
  /** 左右がそろっているときだけ値を返す。larger は差が丸めて 0 なら null。 */
  export function sideDifference(point: CircumferencePoint, decimals: number):
    { amount: number; larger: Side | null } | null;
  ```
- Produces（`history-graph-query.ts`）:
  ```ts
  export async function buildCircumferenceSeries(input: {
    range: { start: string; end: string }; limb: Limb; site: CircumferenceSite;
  }): Promise<CircumferencePoint[]>; // listMeasurementsInRange("0000-01-01", range.end) を buildCircumferencePoints に渡す
  ```
- `rangeStart` との比較は、記録の `date`（`YYYY-MM-DD`）で行う。今の BMI の点と同じ扱いにする。
- 時刻の並べ替えは、今の `sortByTime` と同じく `Date.parse` で比べる。

- [ ] **Step 1: 失敗するテストを書く**（`circumference.test.ts`）

```ts
const rec = (date: string, time: string, values: Record<string, number>): MeasurementRecord => ({
  id: `${date}${time}`, date, recordedAt: `${date}T${time}:00+09:00`, values, note: "", updatedAt: "",
});

test("buildCircumferencePoints uses the previous same-side value, even from before the range", () => {
  const points = buildCircumferencePoints(
    [
      rec("2026-10-20", "07:00", { armBelowElbowRight: 24.5, armBelowElbowLeft: 22.4 }),
      rec("2026-09-30", "07:00", { armBelowElbowRight: 24.2 }),
      rec("2026-10-21", "07:00", { armBelowElbowLeft: 22.5, weight: 60 }),
      rec("2026-10-21", "08:00", { weight: 60 }),
    ],
    "arm", "belowElbow", "2026-10-01",
  );
  expect(points).toEqual([
    { at: "2026-10-20T07:00:00+09:00", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: 24.5 - 24.2 } },
    { at: "2026-10-21T07:00:00+09:00", left: { value: 22.5, delta: 22.5 - 22.4 } },
  ]);
});

test("formatDelta rounds before choosing the sign", () => {
  expect(formatDelta(24.5 - 24.2, 1)).toBe("+0.3");
  expect(formatDelta(-0.2, 1)).toBe("−0.2");
  expect(formatDelta(0.04, 1)).toBe("±0.0");
  expect(formatDelta(0, 1)).toBe("±0.0");
});

test("sideDifference only pairs sides of the same record", () => {
  expect(sideDifference({ at: "x", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: null } }, 1))
    .toEqual({ amount: 2.1, larger: "right" });
  expect(sideDifference({ at: "x", left: { value: 22.4, delta: null } }, 1)).toBeNull();
  expect(sideDifference({ at: "x", left: { value: 22.4, delta: null }, right: { value: 22.4, delta: null } }, 1))
    .toEqual({ amount: 0, larger: null });
});
```

`amount` は丸めた値で比べる（`2.1`）。

`history-graph-query.test.ts` には、既存のテストのやり方（fake-indexeddb に記録を入れる）で次の1件を足す。「`buildCircumferenceSeries` が、範囲より前の記録を差に使い、範囲の点だけを返す」。

- [ ] **Step 2: テストを実行し、失敗することを確かめる**

Run: `npx vitest run src/features/measurements/circumference.test.ts src/features/history/history-graph-query.test.ts`
Expected: FAIL

- [ ] **Step 3: 上の関数を実装する**

- [ ] **Step 4: テストを実行し、通ることを確かめる**

Run: `npx vitest run src/features/measurements src/features/history && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/measurements src/features/history
git commit -m "feat: circumference graph points with previous and left/right differences"
```

---

### Task 6: 周径のグラフ画面

**Files:**
- Create: `src/features/history/components/circumference-graph.tsx`
- Modify: `src/features/history/components/history-graphs.tsx`
- Modify: `src/features/history/history-graph-query.ts`（`GraphMetricSelection` に `{ kind: "circumference" }` を足す）
- Test: `src/features/history/components/history-graphs.test.tsx`
- Modify: `src/features/i18n/messages/ja.ts`, `en.ts`

**Interfaces:**
- Consumes: Task 1 の型・`readCircumferenceLimb`/`writeCircumferenceLimb`・`SIDE_COLORS`、Task 5 の `buildCircumferenceSeries`、`formatDelta`、`sideDifference`、`history-chart.tsx` の `formatPointTime`
- Produces: `export function CircumferenceGraph(props: { range: { start: string; end: string } }): JSX.Element`
- i18n キー：
  - `history_graph_metric_circumference`（ja「周径」、en「Circumference」）
  - `circumference_tooltip_side`（ja「{side} {value}cm（前回 {delta}）」、en「{side} {value} cm (prev. {delta})」）
  - `circumference_tooltip_side_no_previous`（ja「{side} {value}cm」）
  - `circumference_tooltip_difference`（ja「左右差 {amount}（{side}が大きい）」、en「Difference {amount} ({side} larger)」）
  - `circumference_tooltip_difference_equal`（ja「左右差 0.0」）

変更の内容：
- `HistoryGraphs` の選択肢では、`{ kind: "circumference" }`（「周径」）を、グラフに出す基本項目の後、BMI の前に置く。
  - 選ばれたら `buildHistoryGraphSeries` は呼ばず、`<CircumferenceGraph range={…} />` を出す。期間ボタンはそのまま使う。
  - `buildHistoryGraphSeries` に `circumference` が渡された場合は、空の系列を返す（型を通すため）。
- `CircumferenceGraph` の作り：
  - 上に「腕｜脚」の切り替えを置く。初めは `readCircumferenceLimb()`。切り替えたら `writeCircumferenceLimb`。
  - その下に、その側の5部位のボタン（`aria-pressed`）を並べる。初めは1つ目の部位。
  - グラフは Recharts の `LineChart` にする。データは点ごとに `{ timestamp, leftValue?, rightValue? }`。
    - `Line` を左右の2本描き、`connectNulls` を付ける。
    - 横軸は今の `HistoryChart` と同じ（時刻、「M/D」の目盛り）。
    - 左は丸の点、右は四角の点にして、色だけに頼らない。凡例には「左」「右」の文字を出す。
  - 吹き出しは1つにまとめ、次の順で出す。
    - 時刻（`formatPointTime`）
    - 右の行
    - 左の行（`delta` が null なら `_no_previous` を使う）
    - 左右がそろっていれば左右差の行
  - 点がなければ、今と同じく `history_graphs_empty` を出す。

- [ ] **Step 1: 失敗するテストを書く**（`history-graphs.test.tsx`。`buildCircumferenceSeries` もモックする）

```ts
it("shows the circumference graph with limb and site switches and requests that site", async () => {
  window.localStorage.setItem("exerlog-circumference-limb", "arm");
  const query = await import("@/features/history/history-graph-query");
  vi.mocked(query.buildHistoryGraphSeries).mockResolvedValue({ unit: "kg", decimals: 1, points: [] });
  vi.mocked(query.buildCircumferenceSeries).mockResolvedValue([
    { at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: 0.3 } },
  ]);
  renderGraphs();
  await userEvent.selectOptions(await screen.findByLabelText("表示する項目"), screen.getByText("周径"));
  await waitFor(() =>
    expect(query.buildCircumferenceSeries).toHaveBeenLastCalledWith(expect.objectContaining({ limb: "arm", site: "palm" })),
  );
  await userEvent.click(screen.getByRole("button", { name: "肘下5cm" }));
  await waitFor(() =>
    expect(query.buildCircumferenceSeries).toHaveBeenLastCalledWith(expect.objectContaining({ site: "belowElbow" })),
  );
  await userEvent.click(screen.getByRole("tab", { name: "脚" }));
  await waitFor(() =>
    expect(query.buildCircumferenceSeries).toHaveBeenLastCalledWith(expect.objectContaining({ limb: "leg", site: "instep" })),
  );
  expect(window.localStorage.getItem("exerlog-circumference-limb")).toBe("leg");
});
```

吹き出しの文言は、吹き出しの中身を返す小さな関数（例 `circumferenceTooltipLines(point, t): string[]`）に分けて、`circumference-graph.test.tsx` で次を確かめる。
- `["10/20 07:10", "右 24.5cm（前回 +0.3）", "左 22.4cm", "左右差 2.1（右が大きい）"]`
- 左だけの点では、左右差の行がない。

- [ ] **Step 2: テストを実行し、失敗することを確かめる**

Run: `npx vitest run src/features/history`
Expected: 新しいテストが FAIL

- [ ] **Step 3: 上の変更を実装する**

- [ ] **Step 4: テストを実行し、通ることを確かめる**

Run: `npx vitest run src/features/history && npx tsc --noEmit && npm test`
Expected: すべて PASS

- [ ] **Step 5: 実際の画面で確かめる**

`npm run dev` を起動する。次の流れで、記録とグラフを目で確かめる。
1. 腕と脚の値を数件記録する。
2. 履歴のグラフで「周径」を選ぶ。
3. 左右2本の線と吹き出しが出ることを確かめる。

ダークテーマでも見えることを確かめる。

- [ ] **Step 6: Commit**

```bash
git add src/features/history src/features/measurements src/features/i18n/messages
git commit -m "feat: circumference graph with left/right lines and differences"
```
