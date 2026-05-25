import { expect, test } from "vitest";

import { mapWellnessToCondition } from "./wellness-to-condition";

test("maps average scores at or below 2 to tired", () => {
  expect(mapWellnessToCondition({ physicalScore: 2, mentalScore: 2 })).toBe("tired");
  expect(mapWellnessToCondition({ physicalScore: 1, mentalScore: 2 })).toBe("tired");
});

test("maps average scores at or above 4 to good", () => {
  expect(mapWellnessToCondition({ physicalScore: 4, mentalScore: 4 })).toBe("good");
  expect(mapWellnessToCondition({ physicalScore: 5, mentalScore: 3 })).toBe("good");
});

test("maps middle-range average scores to okay", () => {
  expect(mapWellnessToCondition({ physicalScore: 3, mentalScore: 3 })).toBe("okay");
  expect(mapWellnessToCondition({ physicalScore: 2, mentalScore: 5 })).toBe("okay");
});
