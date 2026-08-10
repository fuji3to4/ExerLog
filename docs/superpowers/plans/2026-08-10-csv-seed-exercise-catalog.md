# CSV Seed Exercise Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate `src/features/catalog/exercise-catalog.ts` at build time from `public/exercises.csv`, falling back to a committed default when the CSV is absent, without changing how IndexedDB seeding/priority works.

**Architecture:** A new Node CommonJS script (`scripts/generate-exercise-catalog.js`, backed by a pure parsing/validation module `scripts/csv-to-catalog.js`) reads `public/exercises.csv` via `papaparse`, validates every row, and writes a generated `exercise-catalog.ts`. If the CSV is missing, it writes a one-line re-export of a committed `exercise-catalog.default.ts` (the renamed current dummy data). The generator runs automatically before `dev`, `build`, and `test` via npm pre-hooks. `exercise-catalog.ts` becomes a gitignored build artifact; `exercise-catalog.default.ts` stays committed.

**Tech Stack:** Node.js (CommonJS scripts, no TypeScript runtime needed), `papaparse` for CSV parsing, Vitest for script tests.

## Global Constraints

- CI runs on Node 20 (see `.github/workflows/deploy.yml`) — scripts must run as plain `node script.js`, no `ts-node`/`tsx`/native TS stripping.
- No runtime (browser) CSV loading — `next.config.ts` uses `output: "export"` (static export), and the catalog is consumed by client-side Dexie code, so all CSV processing happens at build/dev time only.
- Invalid CSV data must fail the build (`process.exit(1)`), with all row errors reported together, not just the first.
- `exercise-catalog.repository.ts`'s `seedIfEmpty()` (IndexedDB-first priority) must not change.
- Generated `exercise-catalog.ts` must keep exporting `exerciseCatalog: ExerciseVideo[]` so all existing consumers keep working unchanged.

---

### Task 1: Add papaparse dev dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto-updated by npm)

**Interfaces:**
- Produces: `papaparse` importable via `require("papaparse")` in Node scripts.

- [ ] **Step 1: Install the dependency**

Run: `npm install --save-dev papaparse`

- [ ] **Step 2: Verify it resolves**

Run: `node -e "console.log(typeof require('papaparse').parse)"`
Expected: `function`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add papaparse for CSV catalog generation"
```

---

### Task 2: CSV parsing & validation module

**Files:**
- Create: `scripts/csv-to-catalog.js`
- Test: `scripts/csv-to-catalog.test.js`

**Interfaces:**
- Consumes: `papaparse` (from Task 1).
- Produces: `parseCsvToCatalog(csvText: string) -> { rows: Array<{ id: string, title: string, description: string, videoUrl: string, thumbnailUrl: string, bodyArea: string, purpose: string, durationMinutes: number, intensity: "low"|"medium"|"high" }>, errors: string[] }`. `rows` only contains rows that had zero validation errors; `errors` contains one formatted string per invalid row (may contain multiple issues joined by `, `). Consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Create `scripts/csv-to-catalog.test.js`:

```js
const { parseCsvToCatalog } = require("./csv-to-catalog");

const HEADER =
  "id,title,description,videoUrl,thumbnailUrl,bodyArea,purpose,durationMinutes,intensity";

test("parses a valid CSV into ExerciseVideo rows", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([]);
  expect(rows).toEqual([
    {
      id: "walk-1",
      title: "Walk",
      description: "A short walk.",
      videoUrl: "https://example.com/v",
      thumbnailUrl: "/thumb.jpg",
      bodyArea: "full-body",
      purpose: "endurance",
      durationMinutes: 10,
      intensity: "medium",
    },
  ]);
});

test("strips a leading UTF-8 BOM before parsing", () => {
  const csv =
    "\uFEFF" +
    [
      HEADER,
      "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
    ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([]);
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe("walk-1");
});

test("reports missing required fields", () => {
  const csv = [
    HEADER,
    ",Walk,,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(rows).toEqual([]);
  expect(errors).toEqual(['row 2: missing "id", missing "description"']);
});

test("reports an invalid intensity value", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,extreme",
  ].join("\n");

  const { errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([
    'row 2: invalid "intensity" value "extreme" (must be low, medium, or high)',
  ]);
});

test("reports a non-numeric durationMinutes value", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,abc,medium",
  ].join("\n");

  const { errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([
    'row 2: invalid "durationMinutes" value "abc" (must be a positive number)',
  ]);
});

test("reports duplicate ids", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
    "walk-1,Walk 2,Another walk.,https://example.com/v2,/thumb2.jpg,full-body,endurance,5,low",
  ].join("\n");

  const { rows, errors } = parseCsvToCatalog(csv);

  expect(rows).toHaveLength(1);
  expect(errors).toEqual(['row 3: duplicate "id" value "walk-1"']);
});

test("collects errors from multiple bad rows", () => {
  const csv = [
    HEADER,
    "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,extreme",
    "walk-2,Walk 2,Another walk.,https://example.com/v2,/thumb2.jpg,full-body,endurance,abc,low",
  ].join("\n");

  const { errors } = parseCsvToCatalog(csv);

  expect(errors).toEqual([
    'row 2: invalid "intensity" value "extreme" (must be low, medium, or high)',
    'row 3: invalid "durationMinutes" value "abc" (must be a positive number)',
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/csv-to-catalog.test.js`
Expected: FAIL with "Cannot find module './csv-to-catalog'"

- [ ] **Step 3: Write the implementation**

Create `scripts/csv-to-catalog.js`:

```js
"use strict";

const Papa = require("papaparse");

const REQUIRED_STRING_FIELDS = [
  "id",
  "title",
  "description",
  "videoUrl",
  "thumbnailUrl",
  "bodyArea",
  "purpose",
];

const VALID_INTENSITIES = ["low", "medium", "high"];

function parseCsvToCatalog(csvText) {
  const withoutBom = csvText.replace(/^\uFEFF/, "");
  const parsed = Papa.parse(withoutBom, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = [];
  const errors = [];
  const seenIds = new Set();

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2; // +1 for header row, +1 for 0-based index
    const rowErrors = [];

    for (const field of REQUIRED_STRING_FIELDS) {
      if (!record[field] || record[field].trim() === "") {
        rowErrors.push(`missing "${field}"`);
      }
    }

    if (!VALID_INTENSITIES.includes(record.intensity)) {
      rowErrors.push(
        `invalid "intensity" value "${record.intensity}" (must be low, medium, or high)`
      );
    }

    const durationMinutes = Number(record.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      rowErrors.push(
        `invalid "durationMinutes" value "${record.durationMinutes}" (must be a positive number)`
      );
    }

    if (record.id) {
      if (seenIds.has(record.id)) {
        rowErrors.push(`duplicate "id" value "${record.id}"`);
      }
      seenIds.add(record.id);
    }

    if (rowErrors.length > 0) {
      errors.push(`row ${rowNumber}: ${rowErrors.join(", ")}`);
      return;
    }

    rows.push({
      id: record.id,
      title: record.title,
      description: record.description,
      videoUrl: record.videoUrl,
      thumbnailUrl: record.thumbnailUrl,
      bodyArea: record.bodyArea,
      purpose: record.purpose,
      durationMinutes,
      intensity: record.intensity,
    });
  });

  return { rows, errors };
}

module.exports = { parseCsvToCatalog };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/csv-to-catalog.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/csv-to-catalog.js scripts/csv-to-catalog.test.js
git commit -m "feat: add CSV-to-catalog parsing and validation module"
```

---

### Task 3: Generator script (file I/O + CLI entry point)

**Files:**
- Create: `scripts/generate-exercise-catalog.js`
- Test: `scripts/generate-exercise-catalog.test.js`

**Interfaces:**
- Consumes: `parseCsvToCatalog` from `scripts/csv-to-catalog.js` (Task 2).
- Produces: `run({ csvPath?: string, outputPath?: string }) -> void`, throwing an `Error` (message = joined row errors) when the CSV has invalid rows. Also produces `FALLBACK_CONTENT: string` and `buildGeneratedContent(rows) -> string`, exported for tests. When run directly as `node scripts/generate-exercise-catalog.js`, defaults `csvPath` to `public/exercises.csv` and `outputPath` to `src/features/catalog/exercise-catalog.ts` (both resolved relative to the repo root via `__dirname`), and calls `process.exit(1)` on error. Task 4 wires this into npm scripts and relies on the default paths.

- [ ] **Step 1: Write the failing tests**

Create `scripts/generate-exercise-catalog.test.js`:

```js
const fs = require("fs");
const os = require("os");
const path = require("path");
const { run, FALLBACK_CONTENT } = require("./generate-exercise-catalog");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "catalog-gen-test-"));
}

const HEADER =
  "id,title,description,videoUrl,thumbnailUrl,bodyArea,purpose,durationMinutes,intensity";

test("writes a generated catalog file from a valid CSV", () => {
  const dir = makeTempDir();
  const csvPath = path.join(dir, "exercises.csv");
  const outputPath = path.join(dir, "exercise-catalog.ts");
  fs.writeFileSync(
    csvPath,
    [
      HEADER,
      "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,medium",
    ].join("\n"),
    "utf8"
  );

  run({ csvPath, outputPath });

  const output = fs.readFileSync(outputPath, "utf8");
  expect(output).toContain('import type { ExerciseVideo } from "@/lib/types";');
  expect(output).toContain('"id": "walk-1"');
  expect(output).toContain("export const exerciseCatalog: ExerciseVideo[] =");
});

test("writes the fallback re-export when the CSV is missing", () => {
  const dir = makeTempDir();
  const csvPath = path.join(dir, "does-not-exist.csv");
  const outputPath = path.join(dir, "exercise-catalog.ts");

  run({ csvPath, outputPath });

  expect(fs.readFileSync(outputPath, "utf8")).toBe(FALLBACK_CONTENT);
});

test("throws with all row errors when the CSV is invalid", () => {
  const dir = makeTempDir();
  const csvPath = path.join(dir, "exercises.csv");
  const outputPath = path.join(dir, "exercise-catalog.ts");
  fs.writeFileSync(
    csvPath,
    [
      HEADER,
      "walk-1,Walk,A short walk.,https://example.com/v,/thumb.jpg,full-body,endurance,10,extreme",
    ].join("\n"),
    "utf8"
  );

  expect(() => run({ csvPath, outputPath })).toThrow(/invalid "intensity" value "extreme"/);
  expect(fs.existsSync(outputPath)).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/generate-exercise-catalog.test.js`
Expected: FAIL with "Cannot find module './generate-exercise-catalog'"

- [ ] **Step 3: Write the implementation**

Create `scripts/generate-exercise-catalog.js`:

```js
"use strict";

const fs = require("fs");
const path = require("path");
const { parseCsvToCatalog } = require("./csv-to-catalog");

const DEFAULT_CSV_PATH = path.join(__dirname, "..", "public", "exercises.csv");
const DEFAULT_OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "features",
  "catalog",
  "exercise-catalog.ts"
);

const FALLBACK_CONTENT = 'export { exerciseCatalog } from "./exercise-catalog.default";\n';

function buildGeneratedContent(rows) {
  return `import type { ExerciseVideo } from "@/lib/types";\n\nexport const exerciseCatalog: ExerciseVideo[] = ${JSON.stringify(
    rows,
    null,
    2
  )};\n`;
}

function run({ csvPath = DEFAULT_CSV_PATH, outputPath = DEFAULT_OUTPUT_PATH } = {}) {
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(outputPath, FALLBACK_CONTENT, "utf8");
    return;
  }

  const csvText = fs.readFileSync(csvPath, "utf8");
  const { rows, errors } = parseCsvToCatalog(csvText);

  if (errors.length > 0) {
    throw new Error(`Invalid data in ${csvPath}:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  fs.writeFileSync(outputPath, buildGeneratedContent(rows), "utf8");
}

if (require.main === module) {
  try {
    run();
    console.log(`Generated ${path.relative(process.cwd(), DEFAULT_OUTPUT_PATH)}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { run, buildGeneratedContent, FALLBACK_CONTENT };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/generate-exercise-catalog.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-exercise-catalog.js scripts/generate-exercise-catalog.test.js
git commit -m "feat: add exercise catalog generator script"
```

---

### Task 4: Wire generation into the app (default file, gitignore, npm hooks, CSV in git)

**Files:**
- Rename (git mv): `src/features/catalog/exercise-catalog.ts` -> `src/features/catalog/exercise-catalog.default.ts`
- Modify: `src/features/catalog/catalog.test.ts`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify (track in git): `public/exercises.csv` (currently untracked)

**Interfaces:**
- Consumes: `run()` from `scripts/generate-exercise-catalog.js` (Task 3), invoked via npm pre-hooks — no direct code dependency.
- Produces: `src/features/catalog/exercise-catalog.ts` (gitignored, generated) still exports `exerciseCatalog: ExerciseVideo[]`, used unchanged by `src/features/storage/exercise-catalog.repository.ts` and all other existing consumers.

- [ ] **Step 1: Rename the current catalog file to the default fallback**

```bash
git mv src/features/catalog/exercise-catalog.ts src/features/catalog/exercise-catalog.default.ts
```

The file's content does not need to change — it already exports `exerciseCatalog: ExerciseVideo[]` with the current 6 dummy entries.

- [ ] **Step 2: Update the existing catalog test to import from the default file**

In `src/features/catalog/catalog.test.ts`, change the only import line from:

```ts
import { exerciseCatalog } from "./exercise-catalog";
```

to:

```ts
import { exerciseCatalog } from "./exercise-catalog.default";
```

No other changes to this file — the rest of the assertions stay identical.

- [ ] **Step 3: Add the generated file to .gitignore**

Append to `.gitignore` (which currently ends with `.env` and no trailing newline):

```
src/features/catalog/exercise-catalog.ts
```

- [ ] **Step 4: Add npm pre-hooks to run the generator**

In `package.json`, add three scripts alongside the existing `dev`, `build`, `start`, `lint`, `test` entries:

```json
"predev": "node scripts/generate-exercise-catalog.js",
"prebuild": "node scripts/generate-exercise-catalog.js",
"pretest": "node scripts/generate-exercise-catalog.js"
```

- [ ] **Step 5: Track the CSV file in git**

`public/exercises.csv` was placed manually and is currently untracked. Stage it so the CSV-driven path actually works for other clones/CI:

```bash
git add public/exercises.csv
```

- [ ] **Step 6: Generate the catalog once and run the full test suite**

Run: `node scripts/generate-exercise-catalog.js`
Expected: prints `Generated src/features/catalog/exercise-catalog.ts`, and the file now contains the CSV-derived data (verify with `cat src/features/catalog/exercise-catalog.ts` — should contain `"id": "breathing-reset-3"` etc., matching `public/exercises.csv`).

Run: `npm test`
Expected: all existing test files pass, including `src/features/catalog/catalog.test.ts` (now against the default file), `src/features/storage/*`, `src/features/today/*`, `src/app/exercises/*`, and the two new script test files from Tasks 2–3.

- [ ] **Step 7: Verify the no-CSV fallback path manually**

Run (temporarily rename the CSV to simulate its absence, then restore it):

```bash
mv public/exercises.csv public/exercises.csv.bak
node scripts/generate-exercise-catalog.js
cat src/features/catalog/exercise-catalog.ts
mv public/exercises.csv.bak public/exercises.csv
node scripts/generate-exercise-catalog.js
```

Expected: with the CSV absent, the generated file is exactly `export { exerciseCatalog } from "./exercise-catalog.default";`; after restoring the CSV and regenerating, the file goes back to containing the CSV-derived data.

- [ ] **Step 8: Verify the production build**

Run: `npm run build`
Expected: `prebuild` regenerates the catalog, then the Next.js static export build succeeds with no type errors (the generated file is included in `tsconfig.json`'s `**/*.ts` and must type-check against `ExerciseVideo[]`).

- [ ] **Step 9: Commit**

```bash
git add src/features/catalog/exercise-catalog.default.ts src/features/catalog/catalog.test.ts .gitignore package.json public/exercises.csv
git commit -m "feat: generate exercise catalog from public/exercises.csv at build time"
```

Note: `src/features/catalog/exercise-catalog.ts` (old path, now gitignored) should show as deleted-from-git/untracked in `git status` — confirm it is NOT included in this commit (it's a build artifact, regenerated by `predev`/`prebuild`/`pretest`).

---

## Post-plan sanity check

After Task 4, confirm end-to-end from a clean state:

```bash
rm src/features/catalog/exercise-catalog.ts
npm run dev
```

Expected: `predev` regenerates `src/features/catalog/exercise-catalog.ts` from `public/exercises.csv` before the dev server starts, and the app loads the exercise catalog normally. Stop the dev server after confirming (Ctrl+C) — this is a manual check, not part of the automated task steps.
