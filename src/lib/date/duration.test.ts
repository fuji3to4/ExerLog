import { describe, expect, it } from "vitest";
import { formatDuration, joinDuration, splitDuration } from "./duration";

describe("duration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(330)).toBe("5:30");
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats an hour or more as h:mm:ss", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("splits seconds into minutes and seconds", () => {
    expect(splitDuration(330)).toEqual({ minutes: 5, seconds: 30 });
  });

  it("joins minutes and seconds", () => {
    expect(joinDuration(5, 30)).toBe(330);
  });
});
