import { describe, expect, it } from "vitest";

import { calculateBmi } from "./bmi";

describe("calculateBmi", () => {
  it("rounds to one decimal", () => {
    expect(calculateBmi(60, 170)).toBe(20.8);
  });

  it("returns null for non-positive height or weight", () => {
    expect(calculateBmi(60, 0)).toBeNull();
    expect(calculateBmi(0, 170)).toBeNull();
    expect(calculateBmi(-1, 170)).toBeNull();
  });

  it("returns null for non-finite input", () => {
    expect(calculateBmi(Number.NaN, 170)).toBeNull();
    expect(calculateBmi(60, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
