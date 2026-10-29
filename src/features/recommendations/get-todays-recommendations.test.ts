import { exerciseCatalog } from "../catalog/exercise-catalog.default";
import { getTodaysRecommendations, type RecommendationHistory } from "./get-todays-recommendations";

const stampedCatalog = exerciseCatalog.map((exercise) => ({ ...exercise, updatedAt: "2026-10-20T00:00:00+09:00" }));
const today = "2026-03-23";
const noHistory: RecommendationHistory = { watches: [], logs: [] };

function watches(exerciseId: string, date: string, count = 1) {
  return Array.from({ length: count }, () => ({ exerciseId, date }));
}

function log(exerciseId: string, date: string, time = "09:00") {
  return { exerciseId, date, performedAt: `${date}T${time}:00+09:00` };
}

function recommend(history: RecommendationHistory, options: { reshuffle?: number; conditionLevel?: "good" | "okay" | "tired" } = {}) {
  return getTodaysRecommendations({
    catalog: stampedCatalog,
    conditionLevel: options.conditionLevel ?? "okay",
    date: today,
    history,
    reshuffle: options.reshuffle ?? 0,
  });
}

const ids = (result: ReturnType<typeof recommend>) => result.map((item) => item.exercise.id);

test("returns lower intensity items when the user feels tired", () => {
  const result = recommend(noHistory, { conditionLevel: "tired" });

  expect(result.every((item) => item.exercise.intensity !== "high")).toBe(true);
});

test("returns a stable set of three distinct recommendations for one day", () => {
  const result = recommend(noHistory);

  expect(result).toHaveLength(3);
  expect(new Set(ids(result)).size).toBe(3);
  expect(result).toEqual(recommend(noHistory));
});

test("the usual pick comes from the most watched exercises of the last 30 days", () => {
  const history: RecommendationHistory = {
    watches: [...watches("hip-mobility-6", "2026-03-20", 4), ...watches("walk-in-place-10", "2026-01-10", 9)],
    logs: [],
  };

  const usual = recommend(history).find((item) => item.slot === "usual");

  expect(usual?.exercise.id).toBe("hip-mobility-6");
});

test("today's watches and logs do not change today's recommendations", () => {
  const history: RecommendationHistory = {
    watches: watches("hip-mobility-6", "2026-03-20", 2),
    logs: [log("shoulder-roll-4", "2026-03-21")],
  };
  const withToday: RecommendationHistory = {
    watches: [...history.watches, ...watches("walk-in-place-10", today, 5)],
    logs: [...history.logs, log("hip-mobility-6", today, "08:00"), log("neck-mobility-5", today, "10:00")],
  };

  expect(recommend(withToday)).toEqual(recommend(history));
});

test("the fresh pick prefers an exercise never watched or logged", () => {
  const touched = ["shoulder-roll-4", "hip-mobility-6", "seated-calf-raise-5", "neck-mobility-5", "walk-in-place-10"];
  const history: RecommendationHistory = {
    watches: touched.map((id) => ({ exerciseId: id, date: "2026-03-01" })),
    logs: [],
  };

  const fresh = recommend(history).find((item) => item.slot === "new");

  expect(fresh?.exercise.id).toBe("breathing-reset-3");
});

test("once everything has been touched, the fresh pick is the one untouched the longest", () => {
  const history: RecommendationHistory = {
    watches: [
      { exerciseId: "shoulder-roll-4", date: "2026-03-20" },
      { exerciseId: "hip-mobility-6", date: "2026-03-19" },
      { exerciseId: "seated-calf-raise-5", date: "2026-03-18" },
      { exerciseId: "neck-mobility-5", date: "2026-03-17" },
      { exerciseId: "walk-in-place-10", date: "2026-03-16" },
    ],
    logs: [log("breathing-reset-3", "2026-02-01")],
  };

  const fresh = recommend(history).find((item) => item.slot === "revisit");

  expect(fresh?.exercise.id).toBe("breathing-reset-3");
});

test("the change-of-pace pick works a different body area from the last logged exercise", () => {
  const history: RecommendationHistory = {
    watches: [],
    logs: [log("hip-mobility-6", "2026-03-20", "08:00"), log("neck-mobility-5", "2026-03-22", "18:00")],
  };

  const change = recommend(history).find((item) => item.slot === "change");

  expect(change).toBeDefined();
  expect(change?.exercise.bodyArea).not.toBe("upper-body");
});

test("the change-of-pace pick still knows the last body area when that exercise is filtered out", () => {
  const history: RecommendationHistory = { watches: [], logs: [log("seated-calf-raise-5", "2026-03-22")] };

  const change = recommend(history, { conditionLevel: "tired" }).find((item) => item.slot === "change");

  expect(change?.exercise.bodyArea).toBeDefined();
  expect(change?.exercise.bodyArea).not.toBe("lower-body");
});

test("unfillable slots are topped up without a label", () => {
  const result = recommend(noHistory);

  expect(result.some((item) => item.slot === "usual")).toBe(false);
  expect(result.filter((item) => item.slot === null).length).toBeGreaterThan(0);
});

test("a small catalog yields fewer recommendations rather than repeats", () => {
  const result = getTodaysRecommendations({
    catalog: stampedCatalog.slice(0, 2),
    conditionLevel: "okay",
    date: today,
    history: noHistory,
    reshuffle: 0,
  });

  expect(ids(result).sort()).toEqual(["hip-mobility-6", "shoulder-roll-4"]);
});

test("reshuffling avoids the previous set when the catalog allows it", () => {
  const history: RecommendationHistory = {
    watches: watches("hip-mobility-6", "2026-03-20", 3),
    logs: [log("neck-mobility-5", "2026-03-22")],
  };

  const first = ids(recommend(history));
  const second = ids(recommend(history, { reshuffle: 1 }));

  expect(second).toHaveLength(3);
  expect(second.filter((id) => first.includes(id))).toEqual([]);
  expect(recommend(history, { reshuffle: 1 })).toEqual(recommend(history, { reshuffle: 1 }));
});
