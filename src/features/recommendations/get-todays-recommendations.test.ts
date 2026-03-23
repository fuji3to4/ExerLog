import { exerciseCatalog } from "../catalog/exercise-catalog";
import { getTodaysRecommendations } from "./get-todays-recommendations";

test("returns lower intensity items when the user feels tired", () => {
  const recommendations = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "tired",
    date: "2026-03-23",
  });

  expect(recommendations.every((item) => item.intensity !== "high")).toBe(true);
});

test("returns a stable set of at most three recommendations for one day", () => {
  const result = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result).toHaveLength(3);
  expect(result).toEqual(
    getTodaysRecommendations({
      catalog: exerciseCatalog,
      conditionLevel: "okay",
      date: "2026-03-23",
    }),
  );
});

test("returns the same known recommendation order for a known day", () => {
  const result = getTodaysRecommendations({
    catalog: exerciseCatalog,
    conditionLevel: "okay",
    date: "2026-03-23",
  });

  expect(result.map((item) => item.id)).toEqual([
    "neck-mobility-5",
    "breathing-reset-3",
    "walk-in-place-10",
  ]);
});
