import { describe, expect, it } from "vitest";

import { endIsoFor } from "./end-time";

describe("endIsoFor", () => {
  const start = "2026-11-26T09:00:00+09:00";
  it("is undefined for an empty end", () => {
    expect(endIsoFor(start, "")).toBeUndefined();
  });
  it("is undefined when the end equals the start time", () => {
    expect(endIsoFor(start, "09:00")).toBeUndefined();
  });
  it("keeps the date and offset for a later end", () => {
    expect(endIsoFor(start, "09:30")).toBe("2026-11-26T09:30:00+09:00");
  });
  it("rolls to the next day when the end is earlier", () => {
    expect(endIsoFor("2026-11-26T23:00:00+09:00", "01:15")).toBe("2026-11-27T01:15:00+09:00");
  });
  it("rolls over a month end", () => {
    expect(endIsoFor("2026-11-30T23:00:00+09:00", "00:30")).toBe("2026-12-01T00:30:00+09:00");
  });
});
