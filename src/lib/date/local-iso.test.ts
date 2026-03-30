import { localIsoNow } from "./local-iso";

test("returns a string matching ISO 8601 with UTC offset", () => {
  const result = localIsoNow();
  expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
});

test("offset matches the current environment timezone offset", () => {
  const before = new Date();
  const result = localIsoNow();

  const offsetMinutes = -before.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const h = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const m = String(absMinutes % 60).padStart(2, "0");
  const expectedOffset = `${sign}${h}:${m}`;

  expect(result.endsWith(expectedOffset)).toBe(true);
});

test("never ends in 'Z' (always has explicit offset)", () => {
  const result = localIsoNow();
  expect(result.endsWith("Z")).toBe(false);
});

test("datetime part represents the current local wall-clock time", () => {
  const before = new Date();
  const result = localIsoNow();
  const after = new Date();

  // JS correctly parses ISO 8601 strings with explicit offsets to UTC epoch
  const parsed = new Date(result);
  expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1_000);
  expect(parsed.getTime()).toBeLessThanOrEqual(after.getTime() + 1_000);
});
