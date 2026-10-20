import { exerciseCatalog } from "../catalog/exercise-catalog";
import { getTodaysRecommendations } from "./get-todays-recommendations";

const stampedCatalog = exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" }));

test("returns lower intensity items when the user feels tired", () => {
  const recommendations = getTodaysRecommendations({
    catalog: stampedCatalog,
    conditionLevel: "tired",
    date: "2026-03-23",
  });

  expect(recommendations.every((item) => item.intensity !== "high")).toBe(true);
});

test("returns a stable set of at most three recommendations for one day", () => {
  const result = getTodaysRecommendations({
    catalog: stampedCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result).toHaveLength(3);
  expect(result).toEqual(
    getTodaysRecommendations({
      catalog: stampedCatalog,
      conditionLevel: "okay",
      date: "2026-03-23",
    }),
  );
});

test("returns the same known recommendation order for a known day", () => {
  const result = getTodaysRecommendations({
    catalog: stampedCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result.map((item) => item.id)).toEqual([
    "neck-mobility-5",
    "breathing-reset-3",
    "walk-in-place-10",
  ]);
});
