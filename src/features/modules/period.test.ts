import { describe, expect, it } from "vitest";

import { isValidPeriod, isWithinPeriod, periodDayKeys } from "./period";

const P = { start: "2026-10-01T09:00:00+09:00", end: "2026-10-27T18:00:00+09:00" };

describe("period", () => {
  it("includes both ends and excludes just outside", () => {
    expect(isWithinPeriod("2026-10-01T09:00:00+09:00", P)).toBe(true);
    expect(isWithinPeriod("2026-10-27T18:00:00+09:00", P)).toBe(true);
    expect(isWithinPeriod("2026-10-01T08:59:59+09:00", P)).toBe(false);
    expect(isWithinPeriod("2026-10-27T18:00:01+09:00", P)).toBe(false);
  });

  it("compares instants across offsets", () => {
    expect(isWithinPeriod("2026-10-01T00:30:00+00:00", P)).toBe(true); // = 09:30 JST
    expect(isWithinPeriod("2026-10-01T00:00:00+00:00", P)).toBe(true); // = 09:00 JST
    expect(isWithinPeriod("2026-10-01T08:30:00+00:00", P)).toBe(true); // = 17:30 JST
    expect(isWithinPeriod("2026-09-30T23:59:00+00:00", P)).toBe(false); // = 08:59 JST
  });

  it("isValidPeriod rejects start after end", () => {
    expect(isValidPeriod(P)).toBe(true);
    expect(isValidPeriod({ start: P.end, end: P.start })).toBe(false);
  });

  it("periodDayKeys returns the day keys of both ends", () => {
    expect(periodDayKeys(P)).toEqual({ start: "2026-10-01", end: "2026-10-27" });
  });
});
