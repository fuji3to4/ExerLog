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
