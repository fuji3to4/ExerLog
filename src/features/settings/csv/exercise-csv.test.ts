import { expect, test } from "vitest";
import { generateExerciseCsv, parseExerciseCsv } from "./exercise-csv";

const HEADER = "id,title,description,videoUrl,thumbnailUrl,bodyArea,purpose,durationSeconds,intensity";

test("imports a durationSeconds column as seconds", () => {
  const csv = [HEADER, "a,Walk,desc,https://example.com/v,,full-body,endurance,330,medium"].join("\n");

  const { exercises, skipped } = parseExerciseCsv(csv);

  expect(skipped).toBe(0);
  expect(exercises).toHaveLength(1);
  expect(exercises[0].durationSeconds).toBe(330);
});

test("skips rows with a missing or non-positive durationSeconds", () => {
  const csv = [
    HEADER,
    "a,Walk,desc,https://example.com/v,,full-body,endurance,0,medium",
    "b,Walk,desc,https://example.com/v,,full-body,endurance,,medium",
  ].join("\n");

  const { exercises, skipped } = parseExerciseCsv(csv);

  expect(exercises).toEqual([]);
  expect(skipped).toBe(2);
});

test("exports durationSeconds", () => {
  const csv = generateExerciseCsv([
    {
      id: "a",
      title: "Walk",
      description: "",
      videoUrl: "https://example.com/v",
      thumbnailUrl: "",
      bodyArea: "full-body",
      purpose: "endurance",
      durationSeconds: 330,
      intensity: "medium",
    },
  ]);

  expect(csv.split("\n")[0]).toBe(HEADER);
  expect(csv.split("\n")[1]).toContain(",330,");
});
