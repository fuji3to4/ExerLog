import { formatTime, formatTimestampForCsv } from "./format-timestamp";

// Edge cases — always TZ-agnostic
describe("formatTime", () => {
  test("returns empty string for empty input", () => {
    expect(formatTime("")).toBe("");
  });

  test("returns empty string for invalid ISO string", () => {
    expect(formatTime("not-a-date")).toBe("");
  });

  test("returns HH:MM shaped string for a valid offset ISO string", () => {
    const result = formatTime("2024-03-30T14:32:00+09:00");
    // Format varies by locale (12h or 24h) but always has digits and a colon
    expect(result).toMatch(/\d+:\d{2}/);
  });

  test("returns HH:MM shaped string for a legacy UTC string", () => {
    const result = formatTime("2024-03-30T05:32:00.000Z");
    expect(result).toMatch(/\d+:\d{2}/);
  });
});

describe("formatTimestampForCsv", () => {
  test("returns empty string for empty input", () => {
    expect(formatTimestampForCsv("")).toBe("");
  });

  test("returns empty string for invalid ISO string", () => {
    expect(formatTimestampForCsv("not-a-date")).toBe("");
  });

  test("returns YYYY-MM-DD HH:MM shaped string for a valid offset ISO string", () => {
    const result = formatTimestampForCsv("2024-03-30T14:32:00+09:00");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  test("returns YYYY-MM-DD HH:MM shaped string for a legacy UTC string", () => {
    const result = formatTimestampForCsv("2024-03-30T05:32:00.000Z");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
