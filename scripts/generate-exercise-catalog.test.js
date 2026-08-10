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
  expect(output).toContain(
    "// AUTO-GENERATED from public/exercises.csv by scripts/generate-exercise-catalog.js — DO NOT EDIT."
  );
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

test("throws when the CSV has no data rows", () => {
  const dir = makeTempDir();
  const csvPath = path.join(dir, "exercises.csv");
  const outputPath = path.join(dir, "exercise-catalog.ts");
  fs.writeFileSync(csvPath, `${HEADER}\n`, "utf8");

  expect(() => run({ csvPath, outputPath })).toThrow(/No valid exercise rows found/);
  expect(fs.existsSync(outputPath)).toBe(false);
});
