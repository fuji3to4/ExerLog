import { describe, expect, it } from "vitest";

import { fitWithin } from "./resize";

describe("fitWithin", () => {
  it("fits the long edge to 1600 and never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("rounds to integers", () => {
    expect(fitWithin(3333, 1111)).toEqual({ width: 1600, height: 533 });
  });
});
