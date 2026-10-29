# モジュールのタグとビルド時の初期 ON/OFF 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 記録モジュールにタグ（今回は `lymphedema` だけ）を持たせて設定画面に表示し、タグの付いたモジュールを最初から ON にするかどうかをビルド時の環境変数で決められるようにする。あわせて周径を「腕・脚周径」に改名する。

**Architecture:** タグの型と環境変数の読み取りは新しいファイル `features/modules/module-tags.ts` に置く。初期値の当てはめは、今の `resolveModuleSettings` に「最初は OFF にする id の一覧」を引数で足して行う。`readModuleSettings` は、初期値を当てはめたときにその結果を localStorage に書き込む。タグは画面側の `RecordModule` に持たせ、`use-module-settings.ts` が「最初は OFF にする id」を計算して渡す。

**Tech Stack:** Next.js 15（static export）、React 19、TypeScript、Vitest + Testing Library（jsdom）、shadcn の `badgeVariants`。

**Spec:** `docs/superpowers/specs/2026-10-29-module-tags-and-build-defaults-design.md`

## Global Constraints

- 環境変数名は `NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS`。値はカンマ区切りのタグ。前後の空白は無視し、知らないタグも無視する。ビルドは失敗させない。
- タグの付いていないモジュールは、いつも最初から ON。タグの付いたモジュールは、そのタグのどれかが指定に入っていれば最初から ON、入っていなければ最初は OFF。
- 保存キー `lymly-record-modules` と保存形式 `{ order, disabled }` は変えない。
- 初期値を当てはめるのは、保存された設定がない端末と、保存された `order` にまだ載っていないモジュールだけ。すでに `order` に載っているモジュールは保存された設定のとおりにする。
- モジュール id `circumference`、Dexie のテーブル、同期のタブ名（内部名 `Circumference`）、CSV の列とファイル名は変えない。
- タグの表示名は `module_tag_<tag>`。ja は「リンパ浮腫」、en は "Lymphedema"。
- 周径の新しい表示名は、ja が「腕・脚周径」、en が "Arm & leg circumference"。
- 設定のモジュール一覧は1本のリストのままにする。タグは名前のすぐ横に出す小さな丸いタグで、押しても何も起きない。
- このリポジトリのコメント・テスト名は、周りのコードに合わせる（英語が中心で、一部日本語）。

## Review Focus

1. **以前のバージョンで設定を保存した端末**（`order` にセルフケアなどがすでに入っている）では、環境変数が空でもセルフケア・着用・症状が ON のまま残ること。→ Task 2 のテスト `keeps modules already in the stored order as stored`
2. **環境変数がおかしな値**（空、空白だけ、`" Lymphedema , foo"` のような大文字・空白・知らないタグ）でも落ちないこと。大文字小文字は区別せず、空白を除いて読む。→ Task 1 のテスト `parses the env value loosely`
3. **localStorage が使えない環境**（読み込みや書き込みが例外を投げる）で初めて開いたときに、落ちずに初期値で表示されること。→ Task 2 のテスト `still applies defaults when storage is blocked`
4. **初めて開いたあとに環境変数が変わったとき**に、すでに開いたことのある端末の ON/OFF が変わらないこと。→ Task 2 のテスト `persists the first resolution so a later default change does not flip it`
5. **保存されている `order` が空配列や壊れた値**のときは「保存された設定がない」と同じ扱いにして、初期値を当てはめること。→ Task 2 のテスト `treats an empty or broken order as a fresh device`

---

### Task 1: タグの型と環境変数の読み取り

**Files:**
- Create: `src/features/modules/module-tags.ts`
- Test: `src/features/modules/module-tags.test.ts`

**Interfaces:**
- Produces:
  - `export const MODULE_TAGS = ["lymphedema"] as const;`
  - `export type ModuleTag = (typeof MODULE_TAGS)[number];`
  - `export function parseModuleTags(raw: string | undefined): ReadonlySet<ModuleTag>`
  - `export function defaultOnModuleTags(): ReadonlySet<ModuleTag>`：`parseModuleTags(process.env.NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS)` を返す。Next.js が値を埋め込めるように、`process.env.NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS` は文字どおりに書く。テストで `vi.stubEnv` が効くように、モジュールの読み込み時ではなく呼ばれたときに読む。
  - `export function defaultOffModuleIds(modules: readonly { data: { id: string }; tags?: readonly ModuleTag[] }[], onTags: ReadonlySet<ModuleTag>): string[]`：タグが1つ以上あり、そのどれも `onTags` に入っていないモジュールの id を、渡された順で返す。

- [ ] **Step 1: 失敗するテストを書く**

```ts
describe("module tags", () => {
  it("parses the env value loosely", () => {
    expect([...parseModuleTags(undefined)]).toEqual([]);
    expect([...parseModuleTags("")]).toEqual([]);
    expect([...parseModuleTags("  ,  ")]).toEqual([]);
    expect([...parseModuleTags("lymphedema")]).toEqual(["lymphedema"]);
    expect([...parseModuleTags(" Lymphedema , foo,lymphedema ")]).toEqual(["lymphedema"]);
  });

  it("reads NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS when called", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    expect([...defaultOnModuleTags()]).toEqual(["lymphedema"]);
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "");
    expect([...defaultOnModuleTags()]).toEqual([]);
  });

  it("lists tagged modules whose tags are all off", () => {
    const modules = [
      { data: { id: "wellness" } },
      { data: { id: "selfcare" }, tags: ["lymphedema"] as const },
      { data: { id: "body" }, tags: [] as const },
      { data: { id: "symptoms" }, tags: ["lymphedema"] as const },
    ];
    expect(defaultOffModuleIds(modules, new Set())).toEqual(["selfcare", "symptoms"]);
    expect(defaultOffModuleIds(modules, new Set(["lymphedema"] as const))).toEqual([]);
  });
});
```

`afterEach(() => vi.unstubAllEnvs())` を付ける。

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run src/features/modules/module-tags.test.ts`
Expected: FAIL（`./module-tags` が見つからない）

- [ ] **Step 3: `src/features/modules/module-tags.ts` を実装する**

`parseModuleTags` は、カンマで分割し、`trim().toLowerCase()` した値のうち `MODULE_TAGS` に含まれるものを集める。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx vitest run src/features/modules/module-tags.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/features/modules/module-tags.ts src/features/modules/module-tags.test.ts
git commit -m "feat(modules): module tags and build-time default-ON tag parsing"
```

---

### Task 2: 設定の解決に初期値を当てはめ、初回に保存する

**Files:**
- Modify: `src/features/modules/module-settings.ts`（`resolveModuleSettings`、`readModuleSettings`）
- Test: `src/features/modules/module-settings.test.ts`

**Interfaces:**
- Produces:
  - `resolveModuleSettings(stored: unknown, registryIds: readonly string[], defaultOffIds: readonly string[] = []): ModuleSettings`
  - `readModuleSettings(registryIds: readonly string[], defaultOffIds: readonly string[] = []): ModuleSettings`
  - 既存の呼び出し（引数2つ）はそのまま動く。

- [ ] **Step 1: 失敗するテストを書く**（既存の `describe("module settings")` に足す。`IDS = ["wellness", "body", "circumference"]` を使う）

```ts
it("applies default-off ids on a fresh device", () => {
  expect(resolveModuleSettings(null, IDS, ["circumference"])).toEqual({
    order: IDS,
    disabled: ["circumference"],
  });
});

it("treats an empty or broken order as a fresh device", () => {
  for (const stored of [{ order: [], disabled: [] }, { order: ["ghost"] }, "x"]) {
    expect(resolveModuleSettings(stored, IDS, ["circumference"]).disabled).toEqual(["circumference"]);
  }
});

it("keeps modules already in the stored order as stored", () => {
  expect(
    resolveModuleSettings({ order: ["circumference", "wellness"], disabled: [] }, IDS, ["circumference", "body"]),
  ).toEqual({ order: ["circumference", "wellness", "body"], disabled: ["body"] });
});

it("persists the first resolution so a later default change does not flip it", () => {
  expect(readModuleSettings(IDS, ["circumference"]).disabled).toEqual(["circumference"]);
  expect(JSON.parse(window.localStorage.getItem(MODULE_SETTINGS_STORAGE_KEY)!)).toEqual({
    order: IDS,
    disabled: ["circumference"],
  });
  expect(readModuleSettings(IDS, []).disabled).toEqual(["circumference"]);
});

it("persists when a new registry id gets its default", () => {
  window.localStorage.setItem(MODULE_SETTINGS_STORAGE_KEY, JSON.stringify({ order: ["wellness", "body"], disabled: [] }));
  readModuleSettings(IDS, ["circumference"]);
  expect(JSON.parse(window.localStorage.getItem(MODULE_SETTINGS_STORAGE_KEY)!).order).toEqual(IDS);
});

it("returns the same object on repeated reads after persisting", () => {
  const first = readModuleSettings(IDS, ["circumference"]);
  expect(readModuleSettings(IDS, ["circumference"])).toBe(first);
});

it("still applies defaults when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(readModuleSettings(IDS, ["circumference"])).toEqual({ order: IDS, disabled: ["circumference"] });
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run src/features/modules/module-settings.test.ts`
Expected: FAIL（新しいテストで `disabled` が `[]` のまま。保存もされていない）

- [ ] **Step 3: `resolveModuleSettings` と `readModuleSettings` を変える**

- `resolveModuleSettings`：保存された `order` のうち、知っている id を「既知の id」として集める。`registryIds` のうち既知でなく、かつ `defaultOffIds` に入っている id を、`disabled` の末尾に足す（重複させない）。今の「並びの解決」と「知らない id を落とす」処理はそのまま。
- `readModuleSettings`：解決した結果の `order` が、保存されていた既知の id と比べて増えていたら、`JSON.stringify(value)` を `setItem` で書き込む。保存されていなかった場合（`raw === null`）もこれに含まれる。書き込みに成功したら、`cache.raw` を書き込んだ文字列にして、次の読み込みで同じオブジェクトを返す。書き込みの例外は握りつぶし、listener には知らせない。キャッシュのキーに `defaultOffIds` も含める（今の `ids` の文字列に足す）。`unsaved` の分岐でも、`resolveModuleSettings` に `defaultOffIds` を渡す。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx vitest run src/features/modules/module-settings.test.ts`
Expected: PASS（既存のテストも含めてすべて）

- [ ] **Step 5: コミット**

```bash
git add src/features/modules/module-settings.ts src/features/modules/module-settings.test.ts
git commit -m "feat(modules): apply build-time default-off ids to new modules and persist the first resolution"
```

---

### Task 3: モジュールにタグを付けてつなぐ（環境変数・デプロイ設定も）

**Files:**
- Modify: `src/features/modules/types.ts`（`RecordModule` に `tags?` を足す）
- Modify: `src/features/modules/selfcare/module.tsx`、`src/features/modules/compression/module.tsx`、`src/features/modules/symptoms/module.tsx`（`tags: ["lymphedema"]`）
- Modify: `src/features/modules/use-module-settings.ts`
- Modify: `src/features/modules/registry.ts`（冒頭の手順コメント）
- Modify: `.env.example`、`.github/workflows/deploy.yml`
- Test: `src/features/modules/registry.test.ts`、`src/features/modules/components/module-settings-section.test.tsx`、そのほか壊れたテスト

**Interfaces:**
- Consumes: Task 1 の `ModuleTag`、`defaultOnModuleTags()`、`defaultOffModuleIds()`。Task 2 の `readModuleSettings(ids, defaultOffIds)`、`resolveModuleSettings(stored, ids, defaultOffIds)`。
- Produces: `RecordModule.tags?: readonly ModuleTag[]`（`/** Audience tags shown in settings; tagged modules start OFF unless a tag is in NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS. */`）

- [ ] **Step 1: 失敗するテストを書く**

`registry.test.ts` に足す:

```ts
it("tags the lymphedema-only modules", () => {
  const tagged = RECORD_MODULES.filter((m) => m.tags?.includes("lymphedema")).map((m) => m.data.id);
  expect(tagged).toEqual(["selfcare", "compression", "symptoms"]);
});
```

`module-settings-section.test.tsx` の `"lists the modules in the default order, all ON"` を、次の2つに置き換える（`afterEach(() => vi.unstubAllEnvs())` を足す）:

```ts
it("starts tagged modules OFF when no tag is enabled at build time", () => {
  vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "");
  renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
  const checked = rows().map((r) => within(r).getByRole("switch").getAttribute("aria-checked"));
  expect(checked).toEqual(["true", "true", "true", "true", "false", "false", "false"]);
});

it("starts every module ON when lymphedema is enabled at build time", () => {
  vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
  renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
  for (const r of rows()) expect(within(r).getByRole("switch").getAttribute("aria-checked")).toBe("true");
});
```

元のテストにあった並び順・「並べ替え」ラベル・説明文のアサーションは、後者に移す。

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run src/features/modules/registry.test.ts src/features/modules/components/module-settings-section.test.tsx`
Expected: FAIL（`tags` がない。タグ付きのモジュールが OFF にならない）

- [ ] **Step 3: タグを付けてつなぐ**

- `types.ts` に `tags?` を足し、3つのモジュールに `tags: ["lymphedema"]` を付ける。
- `use-module-settings.ts`：`const defaultOffIds = (): string[] => defaultOffModuleIds(RECORD_MODULES, defaultOnModuleTags());` を足し、`getSnapshot` と `getServerSnapshot` で `readModuleSettings` / `resolveModuleSettings` に渡す。
- `registry.ts` 冒頭の手順コメントに1行足す: `//  6. optionally \`tags\` (module-tags.ts) when the module only serves one audience; tagged modules start OFF unless the build enables the tag.`
- `.env.example` の末尾に足す:
  ```
  # Module tags whose modules start ON on a fresh device (comma-separated). Empty = general build.
  # Lymly (lymphedema build): NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS=lymphedema
  NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS=
  ```
- `deploy.yml` の Build ステップの `env:` に `NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS: ${{ vars.DEFAULT_ON_MODULE_TAGS }}` を足す。

- [ ] **Step 4: 対象のテストが通ることを確かめる**

Run: `npx vitest run src/features/modules/registry.test.ts src/features/modules/components/module-settings-section.test.tsx`
Expected: PASS

- [ ] **Step 5: 全テストを流し、新しい初期値で壊れたテストを直す**

Run: `npm test`

テスト環境では環境変数が空なので、セルフケア・着用・症状は最初 OFF になる。これらが ON であることを前提にしたテストが落ちるかもしれない。候補は `history-screen.test.tsx`、`period-summary-dialog.test.tsx`、`timeline-section.test.tsx`、`data-management.test.tsx`。直し方は2つある。
- テストの前提が「リンパ浮腫向けのビルド」なら、そのファイルで `vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema")` を使う。
- 「一般向けのビルド」なら、期待値を直す。

データ層（`recordModuleData()`、同期、CSV、全消去）は ON/OFF に関係なく全モジュールを扱うので、変わらないはず。そこでテストが落ちたら、つなぎ方の誤りとして調べる。

Expected: すべて PASS。`npx tsc --noEmit` もエラーなし。

- [ ] **Step 6: コミット**

```bash
git add -A src/features .env.example .github/workflows/deploy.yml
git commit -m "feat(modules): tag lymphedema modules and start them per NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS"
```

---

### Task 4: 設定の一覧にタグを表示する

**Files:**
- Modify: `src/features/modules/components/module-settings-section.tsx`（`ModuleRow`）
- Modify: `src/features/i18n/messages/ja.ts`、`src/features/i18n/messages/en.ts`
- Test: `src/features/modules/components/module-settings-section.test.tsx`

**Interfaces:**
- Consumes: `RecordModule.tags`（Task 3）、`ModuleTag`（Task 1）
- Produces: i18n キー `module_tag_lymphedema`（ja「リンパ浮腫」、en "Lymphedema"）

- [ ] **Step 1: 失敗するテストを書く**

```ts
it("shows the lymphedema tag next to the tagged modules only", () => {
  renderWithLanguage(<ModuleSettingsSection />, { initialLanguage: "ja" });
  const tagged = rows()
    .filter((r) => within(r).queryByText("リンパ浮腫"))
    .map((r) => within(r).getByRole("switch").getAttribute("aria-label"));
  expect(tagged).toEqual(["セルフケア", "着用", "症状"]);
});
```

並べ替えのテストが今どおり通ること（タグを足してもスイッチの `aria-label` はモジュール名のまま）も、このタスクの確認に含める。

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npx vitest run src/features/modules/components/module-settings-section.test.tsx`
Expected: FAIL（「リンパ浮腫」の文字がない）

- [ ] **Step 3: タグを表示する**

- 両方の翻訳ファイルの `module_*` の近くに `module_tag_lymphedema` を足す。
- `ModuleRow` では、名前の `<span className="block font-medium">` の中で、名前のあとに `module.tags` ごとに `<span>` を出す。クラスは `cn(badgeVariants({ variant: "secondary" }), "ml-2 px-1.5 py-0 align-middle text-[10px] font-medium")` 程度にする。
- `Badge` コンポーネントは `<div>` を返し、`<span>` の中に置けないので使わない。`badgeVariants` だけを使う。
- 文字は `t(\`module_tag_${tag}\` as const)` で出す。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npx vitest run src/features/modules/components/module-settings-section.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/features/modules/components/module-settings-section.tsx src/features/modules/components/module-settings-section.test.tsx src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts
git commit -m "feat(settings): show module tags next to module names"
```

---

### Task 5: 周径を「腕・脚周径」に改名する

**Files:**
- Modify: `src/features/i18n/messages/ja.ts`、`src/features/i18n/messages/en.ts`
- Test: 「周径」/ "Circumference" をモジュール名として見ているテスト（少なくとも `module-settings-section.test.tsx`。`rg -n '"周径"|"Circumference"' src --glob '*.test.*'` で探す）

**Interfaces:**
- 値だけを変える。キーは変えない。

- [ ] **Step 1: テストの期待値を新しい名前に直す（失敗させる）**

`module-settings-section.test.tsx` の `"周径"` を `"腕・脚周径"` にする（`rowNames()`、`row("周径")` など）。ほかのテストで、モジュール名として「周径」/ "Circumference" を見ているものも同じように直す。「周径（cm）」のような、測る量としての文言を見ているテストはそのままにする。

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `npm test`
Expected: 直したテストが FAIL（まだ「周径」と表示される）

- [ ] **Step 3: 文言を変える**

| キー | ja | en |
|---|---|---|
| `module_circumference_label` | 腕・脚周径 | Arm & leg circumference |
| `module_circumference_description` | 左右を比べる | Compare left and right |
| `circumference_edit_title` | 腕・脚周径の記録を編集 | Edit arm & leg circumference record |
| `settings_export_circumference` | 腕・脚周径 | Arm & leg circumference |
| `sync_tab_Circumference` | 腕・脚周径 | Arm & leg circumference |

ほかの `circumference_*` のキー（部位、ヘルプ、`circumference_heading`、`circumference_summary_*`、ツールチップ）は、測る量としての「周径」なので変えない。

- [ ] **Step 4: テストが通ることを確かめる**

Run: `npm test` と `npx tsc --noEmit`
Expected: すべて PASS、型エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/features/i18n/messages/ja.ts src/features/i18n/messages/en.ts src
git commit -m "feat(circumference): rename the module to arm & leg circumference"
```

---

## 最後の確認

- [ ] `npm test`、`npx tsc --noEmit`、`npm run lint`、`npm run build` が通る。
- [ ] `NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS=lymphedema npm run dev` で、localStorage を空にして設定画面を開くと、7つすべてが ON で、セルフケア・着用・症状の名前の横に「リンパ浮腫」と出る。並べ替えも今どおりできる。
- [ ] 環境変数なしで起動し直しても、上で一度開いた端末の ON/OFF は変わらない。localStorage を空にすると、タグ付きの3つが OFF で始まる。
