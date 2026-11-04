import { expect, test } from "vitest";

import { parseLogDate, shortDayLabel, withLogDate } from "./log-date";

const NOW = new Date(2026, 10, 4, 10, 0, 0);

test("reads a past or today date from the query string", () => {
  expect(parseLogDate("?date=2026-10-19", NOW)).toBe("2026-10-19");
  expect(parseLogDate("?exerciseId=a&date=2026-11-04", NOW)).toBe("2026-11-04");
});

test("ignores missing, malformed, impossible and future dates", () => {
  expect(parseLogDate("", NOW)).toBeNull();
  expect(parseLogDate("?date=2026-1-9", NOW)).toBeNull();
  expect(parseLogDate("?date=2026-02-30", NOW)).toBeNull();
  expect(parseLogDate("?date=2026-11-05", NOW)).toBeNull();
});

test("appends the date to links only when there is one", () => {
  expect(withLogDate("/exercises?exerciseId=a", "2026-10-19")).toBe("/exercises?exerciseId=a&date=2026-10-19");
  expect(withLogDate("/library", "2026-10-19")).toBe("/library?date=2026-10-19");
  expect(withLogDate("/library", null)).toBe("/library");
});

test("formats a short month/day label", () => {
  expect(shortDayLabel("2026-10-09")).toBe("10/9");
});
