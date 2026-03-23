import { toDayKey } from "./day-key";

test("returns the same local day key for the same local calendar date", () => {
  expect(toDayKey(new Date(2026, 2, 23, 8, 30))).toBe("2026-03-23");
  expect(toDayKey(new Date(2026, 2, 23, 21, 45))).toBe("2026-03-23");
  expect(toDayKey("2026-03-23")).toBe("2026-03-23");
});
