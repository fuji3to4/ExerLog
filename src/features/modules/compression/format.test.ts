import { describe, expect, it } from "vitest";

import { clockOf, endLabel, monthDayOf } from "./format";

// The digits are read from the ISO string as recorded, whatever the device timezone is.
describe("compression format", () => {
  it("reads the clock and date from the ISO digits", () => {
    expect(clockOf("2026-10-27T08:10:00+09:00")).toBe("8:10");
    expect(clockOf("2026-10-27T23:05:00-08:00")).toBe("23:05");
    expect(monthDayOf("2026-10-27T00:30:00+09:00")).toBe("10/27");
  });

  it("compares the recorded days for the end label", () => {
    const recordedAt = "2026-10-27T08:10:00+09:00";
    expect(endLabel({ recordedAt, endedAt: "2026-10-27T21:30:00+09:00" })).toBe("21:30");
    expect(endLabel({ recordedAt, endedAt: "2026-10-28T07:00:00+09:00" })).toBe("10/28 7:00");
  });
});
