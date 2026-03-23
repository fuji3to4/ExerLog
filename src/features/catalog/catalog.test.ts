import { exerciseCatalog } from "./exercise-catalog";

test("catalog contains enough metadata for browsing and logging", () => {
  expect(exerciseCatalog).toHaveLength(6);
  expect(exerciseCatalog[0]).toMatchObject({
    id: expect.any(String),
    title: expect.any(String),
    description: expect.any(String),
    videoUrl: expect.any(String),
    thumbnailUrl: expect.any(String),
    bodyArea: expect.any(String),
    purpose: expect.any(String),
    durationMinutes: expect.any(Number),
    intensity: expect.any(String),
  });
});

test("catalog covers the planned browsing dimensions", () => {
  expect(new Set(exerciseCatalog.map((item) => item.bodyArea)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.purpose)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.intensity)).size).toBeGreaterThanOrEqual(2);
  expect(new Set(exerciseCatalog.map((item) => item.durationMinutes)).size).toBeGreaterThanOrEqual(2);
});
