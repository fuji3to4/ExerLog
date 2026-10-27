# 写真の記録モジュール Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 写真（複数枚）＋メモ＋日時を1つの記録として残す「写真」モジュールを足す。端末内に保存し、Google 連携中は写真をドライブの専用フォルダへ、記録とファイル対応表をスプレッドシートへ同期する。

**Architecture:**
- **フォルダ**：記録モジュールの土台に、`src/features/modules/photo/` を1つ足す。
  - データ層：記録・写真の Blob・ファイル対応表・ゴミ箱待ち行列のリポジトリ、シート設定2つ、ドライブ API、ファイル同期。
  - 画面層：入力フォーム、横一列の写真表示、全画面ビューア、履歴フィード、まとめカード。
- **土台への追加**：`RecordModuleData` に、任意の `syncFiles` を1つ足す。同期エンジンは、Tombstones をマージした直後、ほかのタブより前にこれを呼ぶ。

**Tech Stack:** Next.js 15 (static export)、React 19、TypeScript、Dexie 4、Google Drive v3 REST（`drive.file`）、Radix Dialog、Vitest + fake-indexeddb + Testing Library。新しい依存は入れない。

**Spec:** `docs/superpowers/specs/2026-10-27-photo-module-design.md`
（土台の設計書：`docs/superpowers/specs/2026-10-27-record-modules-foundation-design.md`）

## Global Constraints

- **モジュール id**：`photo`。設定の保存に使うので変えない。レジストリの4番目（周径の後ろ）に足す。
- **シートのタブ名**
  - `Photos`（写真の記録）：tombstone の `table` も `Photos`。
  - `PhotoFiles`（写真1枚＝1行のドライブ対応表）：tombstone の `table` も `PhotoFiles`。
- **ドライブ**
  - 専用フォルダの名前は `記録写真`（アプリ名は入れない。Lymly は仮称）。写真1枚＝1ファイルで、ファイル名は `<photoId>.jpg`、mimeType は `image/jpeg`。
  - フォルダは名前ではなく目印で探す：作成時に `appProperties: { "recordApp": "photo-folder" }` を付け、`appProperties has { key='recordApp' and value='photo-folder' } and mimeType='application/vnd.google-apps.folder' and trashed=false` で検索する。
  - 許可は今の `drive.file` のまま。`SCOPES` は変えない。
- **縮小**：JPEG、長い辺は最大 1600px（小さい画像は拡大しない）、画質 0.8。
- **枚数**：1つの記録の写真は1〜20枚。0枚では保存できない。
- **「写真を同期する」の設定**
  - localStorage のキーは `lymly-photo-sync`、値は `"on"` / `"off"`。未設定・読み取り失敗は ON として扱う。
  - OFF のときもアップロードしないだけで、ドライブからの取得とゴミ箱待ち行列の処理は行う。
- **ゴミ箱**
  - ドライブのファイルは `PATCH files/<id>`（`{"trashed": true}`）でゴミ箱へ移す。完全には消さない。
  - 404 は成功とみなす。失敗したものは待ち行列に残し、次の同期でやり直す。
- **日時**：すべての記録は `recordedAt` を持つ（土台の決まり）。日時を比べるときは `Date.parse` を使う。
- **土台の決まり**
  - 画面の文言は ja と en の両方に置く。
  - モジュールのフォルダは、ほかのモジュールのフォルダを import しない。
  - OFF のモジュールは画面からだけ消え、同期・CSV・全削除の対象には残る。
- **合格の条件**
  - `npm test` が全件通る。
  - `npm run lint` のエラーが 0。
  - `npm run build` が成功する。
  - `npx tsc --noEmit` の結果に、作業開始時点で既にエラーのあるテストファイル以外のエラーがない（開始時に一覧を記録しておく）。

## Review Focus

1. **同期の途中で記録を消した／写真を外した**：消した写真のドライブファイルは、待ち行列に入っている限り次の同期でゴミ箱へ移る。同じ同期の中で、消した写真をアップロードし直さない。→ Task 2 のテスト。
2. **別の端末から来た記録の写真が、まだドライブにない（`PhotoFiles` に行がない）**：「まだアップロードされていません」を出す。次の同期で行が届いたら、表示し直したときに取れる。→ Task 4 のテスト。
3. **読めない画像が混じった複数選択**（HEIC など）：その1枚だけ「読み込めませんでした」として外し、残りは追加される。→ Task 3 のテスト。
4. **21枚目以降の追加**：20枚を超えた分は追加せず、「写真は20枚までです」と出す。→ Task 3 のテスト。
5. **別の端末で消された記録（tombstone で届く）**：その端末に残った写真の Blob とファイル対応表が、次の同期で片付く。→ Task 2 のテスト。

---

## ファイル構成（完成時）

```
src/lib/types.ts                         PhotoRecord / PhotoBlob / PhotoFile / PhotoTrashItem を足す
src/features/storage/app-db.ts           v12：4テーブル追加
src/features/modules/types.ts            RecordModuleData.syncFiles?（任意）を足す
src/features/sync/sync-engine.ts         Tombstones の直後に syncFiles を呼ぶ
src/features/modules/photo/
  resize.ts            fitWithin（純粋関数）/ resizeImage（canvas）
  repository.ts        記録・Blob・対応表・待ち行列の読み書き
  sync-config.ts       Photos / PhotoFiles の TableSyncConfig
  drive.ts             フォルダ探索・作成、アップロード、ダウンロード、ゴミ箱
  photo-sync-setting.ts「写真を同期する」の読み書きと useSyncExternalStore フック
  file-sync.ts         syncPhotoFiles（待ち行列・片付け・アップロード）
  data.ts              photoData: RecordModuleData<PhotoRecord>
  csv.ts               generatePhotosCsv
  use-photo-url.ts     写真1枚の表示用 URL と状態（端末→ドライブ）
  photo-thumb.tsx      写真1枚の枠（状態ごとの表示）
  photo-strip.tsx      横一列の写真（押すとビューア）
  photo-viewer.tsx     全画面ビューア（左右にめくる）
  photo-form.tsx       入力・修正フォーム
  summary.ts / summary-card.tsx  期間のまとめ
  module.tsx           photoModule: RecordModule<PhotoRecord>
```

---

### Task 1: 写真のデータとリポジトリ

**Files:**
- Modify: `src/lib/types.ts`、`src/features/storage/app-db.ts`（v12）
- Create: `src/features/modules/photo/resize.ts`（このタスクでは `fitWithin` だけ）、`src/features/modules/photo/repository.ts`
- Test: `src/features/modules/photo/repository.test.ts`、`resize.test.ts`、`src/features/storage/storage.test.ts`（v12 のケースを足す）

**Interfaces:**
- Produces:
  ```ts
  // src/lib/types.ts
  export type PhotoRecord = { id: string; date: string; recordedAt: string; note: string; photoIds: string[]; updatedAt: string };
  /** 端末に保存した写真。blob が null なら未取得（ドライブにだけある）。 */
  export type PhotoBlob = { id: string; recordId: string; blob: Blob | null; width: number; height: number };
  /** シート PhotoFiles の1行。id = 写真の id。 */
  export type PhotoFile = { id: string; recordId: string; driveFileId: string; updatedAt: string };
  export type PhotoTrashItem = { driveFileId: string; queuedAt: string };
  // app-db.ts v12（既存のテーブル定義はそのまま並べ、次を足す）
  //   photoRecords: "id, date, recordedAt", photoBlobs: "id, recordId",
  //   photoFiles: "id, recordId", photoTrash: "driveFileId"
  // resize.ts
  export const PHOTO_MAX_EDGE = 1600;
  export function fitWithin(width: number, height: number, maxEdge?: number): { width: number; height: number }; // 拡大しない、整数に丸める
  // repository.ts
  export const PHOTOS_TABLE = "Photos";
  export const PHOTO_FILES_TABLE = "PhotoFiles";
  export const MAX_PHOTOS_PER_RECORD = 20;
  export type NewPhoto = { blob: Blob; width: number; height: number };
  export function addPhotoRecord(input: { date: string; recordedAt?: string; note: string; photos: NewPhoto[] }): Promise<PhotoRecord>; // 0枚・21枚以上は throw
  /** 記録を更新。keepPhotoIds は残す既存の写真（並び順どおり）、added は末尾に足す新しい写真。 */
  export function updatePhotoRecord(record: PhotoRecord, change: { note: string; recordedAt: string; keepPhotoIds: string[]; added: NewPhoto[] }): Promise<PhotoRecord>;
  export function deletePhotoRecord(id: string): Promise<void>;
  export function listPhotoRecordsForDay(date: string): Promise<PhotoRecord[]>;          // 古い順
  export function listPhotoRecordsInDayRange(start: string, end: string): Promise<PhotoRecord[]>; // 古い順
  export function listAllPhotoRecords(): Promise<PhotoRecord[]>;                          // 古い順
  export function getPhotoBlob(photoId: string): Promise<PhotoBlob | undefined>;
  export function storeFetchedBlob(photoId: string, recordId: string, blob: Blob): Promise<void>;
  export function getPhotoFile(photoId: string): Promise<PhotoFile | undefined>;
  /** 写真の消去（外した写真・記録の削除）で使う内部処理。対応表の行を tombstone 付きで消し、driveFileId があれば photoTrash に積む。 */
  ```
- 削除の流れ：記録を消すと、その記録の写真すべてについて次をまとめて行う。
  - `photoBlobs` から消す。
  - `photoFiles` から消し、`PhotoFiles` の tombstone を付ける。
  - driveFileId があれば `photoTrash` に積む。
  - 記録の tombstone（`Photos`）も付ける。
  - 以上を1つのトランザクションで行う。修正で外した写真も同じ扱いにする。
- 時刻の並びは `Date.parse` で決める（土台の決まり）。

- [ ] **Step 1: 失敗するテストを書く**
  ```ts
  // resize.test.ts
  it("fits the long edge to 1600 and never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  // repository.test.ts（auto-sync は vi.mock する）
  it("adds a record with photos in order and stores each blob");
  it("rejects 0 photos and more than 20 photos");
  it("update keeps, reorders by keepPhotoIds, appends added, and removes the rest");
  it("removing a photo with a drive file queues the file id for trash and tombstones PhotoFiles:<photoId>");
  it("deleting a record removes its blobs and files, tombstones Photos:<id>, and queues every known drive file");
  it("lists a day's records oldest first by instant across offsets");
  // storage.test.ts
  it("opens v12 with photoRecords, photoBlobs, photoFiles and photoTrash, keeping existing tables");
  ```
- [ ] **Step 2: 失敗を確認** — `npx vitest run src/features/modules/photo src/features/storage/storage.test.ts` → FAIL
- [ ] **Step 3: 実装する**（上の Interfaces のとおり。id は `crypto.randomUUID()`、追加と修正は `scheduleSync()` を呼ぶ。既存のリポジトリと同じ形）
- [ ] **Step 4: 成功を確認** — 同じコマンドで PASS
- [ ] **Step 5: Commit** — `feat(photo): photo records, blobs, file map and trash queue`

---

### Task 2: シートとドライブへの同期

**Files:**
- Modify:
  - `src/features/modules/types.ts`（`syncFiles?` を足す）
  - `src/features/sync/sync-engine.ts`
  - `src/features/modules/data-registry.ts`（`photoData` を4番目に）
  - ja/en（`sync_tab_Photos`、`sync_tab_PhotoFiles`、`sync_tab_PhotoDrive`）
- Create: `photo/sync-config.ts`、`photo/drive.ts`、`photo/photo-sync-setting.ts`、`photo/file-sync.ts`、`photo/csv.ts`、`photo/data.ts`
- Test: `photo/sync-config.test.ts`、`photo/drive.test.ts`、`photo/file-sync.test.ts`、`photo/photo-sync-setting.test.ts`、`sync-engine.test.ts`（呼び出し順のケースを足す）、`data-registry.test.ts`（4モジュール）

**Interfaces:**
- Consumes：Task 1 の型とリポジトリ。
- Produces:
  ```ts
  // modules/types.ts — RecordModuleData に足す
  /** 表の同期とは別のファイル同期。Tombstones のマージ直後、ほかのタブより前に呼ばれる。 */
  syncFiles?(accessToken: string): Promise<SyncTableResult>;
  // photo-sync-setting.ts
  export const PHOTO_SYNC_STORAGE_KEY = "lymly-photo-sync";
  export function readPhotoSyncEnabled(): boolean;          // 未設定・失敗は true
  export function writePhotoSyncEnabled(enabled: boolean): void;
  export function usePhotoSyncEnabled(): [boolean, (enabled: boolean) => void]; // useSyncExternalStore
  // drive.ts
  export const PHOTO_FOLDER_NAME = "記録写真";
  export const PHOTO_FOLDER_APP_PROPERTY = { recordApp: "photo-folder" } as const;
  export function findOrCreatePhotoFolder(accessToken: string): Promise<string>; // appProperties の目印で探し、複数なら createdTime が最古、なければ目印付きで作る。id は localStorage "record-photo-folder-id" に覚え、404 なら探し直す
  export function uploadPhoto(accessToken: string, folderId: string, photoId: string, blob: Blob): Promise<string>; // multipart upload → fileId
  export function downloadPhoto(accessToken: string, driveFileId: string): Promise<Blob>; // alt=media
  export function trashDriveFile(accessToken: string, driveFileId: string): Promise<"ok" | "failed">; // 404 は "ok"
  // file-sync.ts
  /** 1) 記録が無くなった写真の Blob と対応表を片付ける 2) ゴミ箱待ち行列を処理する 3) 設定 ON なら未アップロードの写真を上げて photoFiles に行を足す。 */
  export function syncPhotoFiles(accessToken: string): Promise<SyncTableResult>; // tableName "PhotoDrive", rowCount = 上げた枚数, 途中失敗は error に入れて残りは続ける
  // sync-config.ts
  export const photosSyncConfig: TableSyncConfig;     // tab "Photos", key "id", updatedAt "updatedAt", deletable, headers ["id","date","recordedAt","note","photoIds","updatedAt"], photoIds は JSON 配列文字列
  export const photoFilesSyncConfig: TableSyncConfig; // tab "PhotoFiles", key "id", updatedAt "updatedAt", deletable, headers ["id","recordId","driveFileId","updatedAt"]
  // data.ts
  export const photoData: RecordModuleData<PhotoRecord>; // syncConfigs [photosSyncConfig, photoFilesSyncConfig], tables photoRecords/photoBlobs/photoFiles/photoTrash, syncFiles: syncPhotoFiles
  // csv.ts
  export function generatePhotosCsv(records: PhotoRecord[]): string; // ヘッダー date, recordedAt, note, photoCount（formatTimestampForCsv を使う）
  ```
- **同期エンジン**：`doSyncAll` で Tombstones タブをマージした直後に、`recordModuleData()` のうち `syncFiles` を持つものを順に呼ぶ。結果を `results` に足し、`onProgress` に渡す。そのあとで、ほかのタブを同期する。
  - `syncFiles` が失敗しても、ほかのタブの同期は続ける。全体の `success` は false になる。
- **全削除との関係**：`photoData.clearAll()` は、全削除のトランザクションの中で、記録・Blob・対応表を消す。tombstone は `Photos` と `PhotoFiles` の両方に付ける。既知の driveFileId はすべて `photoTrash` に積む。`photoTrash` 自体は消さない。
- **CSV のラベル**：`csv` は `{ fileName: "photos.csv", exportLabelKey: "settings_export_photos" }`。

- [ ] **Step 1: 失敗するテストを書く**
  ```ts
  // sync-config.test.ts
  it("round-trips a photo record with photoIds as a JSON array cell");
  it("reads an empty or malformed photoIds cell as []");
  // drive.test.ts（fetch を vi.fn で差し替え、URL・メソッド・本文を確かめる）
  it("finds the oldest folder by the appProperties marker (not by name) and remembers its id");
  it("creates the folder named 記録写真 with the appProperties marker");
  it("uploads multipart with name '<photoId>.jpg', mimeType image/jpeg, parents [folderId]");
  it("trashes with PATCH {trashed:true}; 404 counts as ok; 500 is failed");
  // file-sync.test.ts（drive.ts を vi.mock）
  it("uploads blobs without a photoFiles row when sync is on, then adds the rows");
  it("skips uploads when sync is off but still empties the trash queue");
  it("keeps a trash item whose call failed and removes the ones that succeeded");
  it("does not upload a photo removed while the queue is processed (removed photos have no blob)");
  it("cleans up blobs and file rows whose record no longer exists");
  // photo-sync-setting.test.ts
  it("defaults to on, persists off/on, and tolerates storage errors");
  // sync-engine.test.ts
  it("runs syncFiles right after Tombstones and before other tabs; its failure marks success false but other tabs still sync");
  ```
- [ ] **Step 2: 失敗を確認** — `npx vitest run src/features/modules src/features/sync` → FAIL
- [ ] **Step 3: 実装する**（上の Interfaces のとおり。fetch の書き方は `google-sheets.ts` と同じ形にする）
- [ ] **Step 4: 成功を確認** — `npm test`、tsc の確認 → PASS
- [ ] **Step 5: Commit** — `feat(photo): sync photo records to sheets and photo files to Drive`

---

### Task 3: 入力フォームとモジュールの登録

**Files:**
- Modify: `photo/resize.ts`（`resizeImage` を足す）、`src/features/modules/registry.ts`（`photoModule` を4番目に）、ja/en
- Create: `photo/photo-form.tsx`、`photo/module.tsx`（このタスクでは `TimelineCard` までを本物にし、`HistoryView` と `SummaryCard` は null を返す仮の部品）
- Test: `photo/photo-form.test.tsx`、`registry.test.ts`（4モジュール）

**Interfaces:**
- Consumes：Task 1 のリポジトリと、Task 2 の `photoData`。
- Produces:
  ```ts
  // resize.ts
  /** 読めない画像は reject。canvas の toBlob("image/jpeg", 0.8)。 */
  export function resizeImage(file: Blob): Promise<NewPhoto>;
  // photo-form.tsx
  export function PhotoForm(props: RecordFormProps<PhotoRecord>): JSX.Element;
  // module.tsx
  export const photoModule: RecordModule<PhotoRecord>; // icon Camera, color "#3b8ea5"
  ```
- **フォームの中身**：時刻（既存の `TimeField`）、写真の小さな一覧、メモ（既存のメモ欄と同じ見た目）、保存・削除（既存の `TimelineDialogFooter`）。
  - 写真の小さな一覧は、各写真に「×」を付け、末尾に「＋追加」を置く。
  - 「📷 撮る」は `<input type="file" accept="image/*" capture="environment">`。
  - 「🖼 選ぶ」は `<input type="file" accept="image/*" multiple>`。
- **追加の流れ**：選んだファイルを1枚ずつ `resizeImage` にかける。
  - 処理中の枠には「処理中」を出す。
  - 失敗した1枚は外し、「読み込めませんでした」を出す。
  - 合計が20枚を超える分は足さず、「写真は20枚までです」を出す。
- **保存できる条件**：写真が1枚以上あり、処理中のものがないこと。
- **修正のとき**：既存の写真は Task 4 の部品がまだないため、このタスクでは `getPhotoBlob` の Blob から `URL.createObjectURL` で表示してよい。Task 4 で `PhotoThumb` に置き換える。
- **タイムラインのカード**：「📷 3枚」とメモ。小さな写真は Task 4 で足す。
- **i18n（ja）**
  - `module_photo_label: "写真"`、`module_photo_description: "写真とメモ"`、`photo_edit_title: "写真の記録を編集"`
  - `photo_take: "📷 撮る"`、`photo_choose: "🖼 選ぶ"`、`photo_add: "＋追加"`、`photo_remove: "この写真を外す"`
  - `photo_processing: "処理中"`、`photo_unreadable: "読み込めませんでした"`、`photo_limit: "写真は20枚までです"`
  - `photo_count: "{count}枚"`
  - `settings_export_photos: "写真の記録をエクスポート（CSV）"`
  - en も足す。

- [ ] **Step 1: 失敗するテストを書く**（`./resize` を vi.mock し、`resizeImage` の成功・失敗を制御する）
  ```ts
  it("adds chosen files in order and saves a record with their blobs");
  it("drops only the unreadable file and shows 読み込めませんでした");          // Review Focus 3
  it("adds at most 20 photos and shows 写真は20枚までです");                   // Review Focus 4
  it("disables save with no photos and while a photo is processing");
  it("editing: removing a photo and adding one saves keepPhotoIds and added");
  it("the add menu lists 写真 as the 4th module and opens 写真を記録");
  ```
- [ ] **Step 2: 失敗を確認** — `npx vitest run src/features/modules` → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 成功を確認** — `npm test`、tsc の確認 → PASS
- [ ] **Step 5: Commit** — `feat(photo): photo record form and module registration`

---

### Task 4: 写真の表示（横一列・全画面・履歴・まとめ）

**Files:**
- Create: `photo/use-photo-url.ts`、`photo/photo-thumb.tsx`、`photo/photo-strip.tsx`、`photo/photo-viewer.tsx`、`photo/summary.ts`、`photo/summary-card.tsx`
- Modify: `photo/module.tsx`（TimelineCard に小さな写真、HistoryView、SummaryCard）、`photo/photo-form.tsx`（既存の写真を PhotoThumb で表示）、ja/en
- Test: `photo/use-photo-url.test.tsx`、`photo/photo-strip.test.tsx`、`photo/summary.test.ts`、`photo/module.test.tsx`

**Interfaces:**
- Consumes：Task 1 の `getPhotoBlob` / `getPhotoFile` / `storeFetchedBlob`、Task 2 の `downloadPhoto`、`trySilentRefresh`（`src/features/sync/google-auth.ts`）。
- Produces:
  ```ts
  // use-photo-url.ts
  export type PhotoUrlState =
    | { status: "loading" } | { status: "ready"; url: string }
    | { status: "not-uploaded" } | { status: "signed-out" } | { status: "failed" };
  /** 端末の Blob → なければ PhotoFiles の driveFileId でドライブから取得して保存。URL はアンマウント時に revoke。 */
  export function usePhotoUrl(photoId: string, recordId: string): PhotoUrlState;
  // photo-thumb.tsx
  export function PhotoThumb(props: { photoId: string; recordId: string; size: number; onClick?(): void }): JSX.Element;
  // photo-strip.tsx
  /** 横一列、はみ出したら横スクロール。押すと PhotoViewer をその写真から開く。 */
  export function PhotoStrip(props: { record: PhotoRecord; thumbSize?: number; maxThumbs?: number }): JSX.Element;
  // photo-viewer.tsx
  export function PhotoViewer(props: { record: PhotoRecord; startIndex: number; open: boolean; onOpenChange(open: boolean): void }): JSX.Element; // Radix Dialog、左右ボタン・←→キー、「2 / 5」表示、Esc と閉じるボタン
  // summary.ts
  export function summarizePhotos(records: PhotoRecord[]): { count: number; photoCount: number; records: PhotoRecord[] } | null; // 時刻順、0件は null
  ```
- **状態ごとの表示文言（ja）**
  - `photo_loading: "読み込み中"`
  - `photo_not_uploaded: "まだアップロードされていません"`
  - `photo_signed_out: "Googleにログインすると表示できます"`
  - `photo_failed: "取得できませんでした"`
  - `photo_viewer_prev: "前の写真"`、`photo_viewer_next: "次の写真"`、`photo_viewer_position: "{index} / {total}"`
  - `period_photo_summary: "{count}件・{photos}枚"`
  - en も足す。
- **画面ごとの使い方**
  - タイムラインのカード：`PhotoStrip`（thumbSize 48、maxThumbs 4。超えた分は「+n」）と、枚数とメモ。
  - 履歴の「写真」チップ：写真の記録を新しい順のカードで並べる。カードは日時・枚数・`PhotoStrip`（thumbSize 72）・メモで、案 A（`.superpowers/brainstorm/938-1793078121/content/photo-record.html`）の形にする。記録がなければ `history_graphs_empty` 相当の「記録がありません」。
  - 期間のまとめ：`SummaryCardFrame` と `usePeriodSummary` を使う。中身は「{count}件・{photos}枚」と、記録ごとの日時＋`PhotoStrip`（thumbSize 56）。
- **取得のやり直し**：取得に失敗した写真（`failed` / `not-uploaded`）は、アンマウントして次に表示したときにまた試す。

- [ ] **Step 1: 失敗するテストを書く**（`drive.ts` と `google-auth` を vi.mock し、`URL.createObjectURL` / `revokeObjectURL` を stub）
  ```ts
  it("usePhotoUrl: ready from a local blob without calling Drive");
  it("usePhotoUrl: not-uploaded when the photo has no PhotoFiles row");             // Review Focus 2
  it("usePhotoUrl: signed-out when there is no token");
  it("usePhotoUrl: downloads, stores the blob, then ready; failed on a download error");
  it("usePhotoUrl: revokes the object URL on unmount");
  it("PhotoStrip shows +n beyond maxThumbs and opens the viewer at the clicked photo");
  it("PhotoViewer moves with next/prev and arrow keys and shows 2 / 3");
  it("summarizePhotos counts records and photos in time order; null when empty");
  it("history view lists photo records newest first");
  ```
- [ ] **Step 2: 失敗を確認** — `npx vitest run src/features/modules/photo` → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 成功を確認** — `npm test`、tsc の確認 → PASS
- [ ] **Step 5: Commit** — `feat(photo): photo strip, viewer, history feed and period summary`

---

### Task 5: 設定のチェックボックスと端末データの保護

**Files:**
- Modify:
  - `src/features/settings/components/google-drive-settings.tsx`（連携中・未連携のどちらの表示にもチェックボックスを置く）
  - `src/features/storage/db-init-provider.tsx`（起動時に `navigator.storage?.persist?.()`）
  - ja/en
- Test: `src/features/settings/components/google-drive-settings.test.tsx`、`src/features/storage/db-init-provider.test.tsx`

**Interfaces:**
- Consumes：Task 2 の `usePhotoSyncEnabled`。
- 文言（ja）：`settings_photo_sync_label: "写真を同期する"`、`settings_photo_sync_note: "OFFにすると、写真はこの端末の中にだけ保存されます"`。en も足す。
- `persist()` は、存在しない・reject のどちらでも何もしない。

- [ ] **Step 1: 失敗するテストを書く**
  ```ts
  it("shows 写真を同期する checked by default and stores off/on in lymly-photo-sync");
  it("shows the note under the checkbox");
  it("asks the browser to persist storage on start and ignores a missing API or a rejection");
  ```
- [ ] **Step 2: 失敗を確認** — `npx vitest run src/features/settings src/features/storage` → FAIL
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 成功を確認** — `npm test`、tsc の確認 → PASS
- [ ] **Step 5: Commit** — `feat(photo): photo sync setting and persistent storage request`

---

### Task 6: 仕上げの確認

- [ ] **Step 1**：`npm test`、`npm run lint`（エラー 0）、`npm run build`、tsc の確認がすべて通る。
- [ ] **Step 2**：`src/features/modules/photo` から、ほかのモジュールのフォルダ（wellness / body / circumference）への import が0件であることを、grep で確かめる。
- [ ] **Step 3**：`npm run dev` で開き、ブラウザで次の流れを確かめる（Google 連携なしの範囲）。
  - 「＋記録する」→「写真」→ 複数選択 → 保存 → タイムラインに小さな写真
  - 写真を押すと全画面ビューアが開き、左右にめくれる
  - 履歴の「写真」チップ、期間のまとめ
  - 設定の「写真を同期する」の表示
  - 確かめたあと、テストデータを消す。
- [ ] **Step 4**：spec の「状態」を「実装済み」にして Commit — `docs: mark photo module implemented`
