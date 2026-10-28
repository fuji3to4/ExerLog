import { describe, expect, it } from "vitest";

import type { CompressionKind, CompressionRecord } from "@/lib/types";
import { dailyWearHours, formatWearMinutes, summarizeCompression, wearMinutes } from "./summary";

function rec(date: string, start: string, end: string | null, kind: CompressionKind = "garment"): CompressionRecord {
  return {
    id: `${date}${start}`,
    date,
    recordedAt: `${date}T${start}:00+09:00`,
    kind,
    endedAt: end === null ? null : `${date}T${end}:00+09:00`,
    note: "",
    updatedAt: `${date}T${start}:00+09:00`,
  };
}

const records = [
  rec("2026-10-01", "08:00", "16:00"),
  rec("2026-10-01", "17:00", "19:00"),
  rec("2026-10-02", "08:00", "18:00"),
  rec("2026-10-03", "08:00", null),
];

describe("compression summary", () => {
  it("wearMinutes spans midnight and is null while worn", () => {
    const r = { ...rec("2026-10-28", "22:00", null), endedAt: "2026-10-29T07:00:00+09:00" };
    expect(wearMinutes(r)).toBe(540);
    expect(wearMinutes(rec("2026-10-28", "22:00", null))).toBeNull();
  });

  it("summarizes days and average per measured day", () => {
    expect(summarizeCompression(records)).toEqual({
      kinds: [{ kind: "garment", days: 3, averageMinutes: 600 }],
    });
    expect(summarizeCompression([])).toBeNull();
  });

  it("dailyWearHours sums finished records per day, oldest first", () => {
    expect(dailyWearHours(records, "garment")).toEqual([
      { date: "2026-10-01", hours: 10 },
      { date: "2026-10-02", hours: 10 },
    ]);
    expect(dailyWearHours(records, "bandage")).toEqual([]);
  });

  it("formats wear minutes", () => {
    expect(formatWearMinutes(800, "ja")).toBe("13時間20分");
    expect(formatWearMinutes(800, "en")).toBe("13h 20m");
    expect(formatWearMinutes(45, "ja")).toBe("45分");
    expect(formatWearMinutes(45, "en")).toBe("45m");
    expect(formatWearMinutes(780, "ja")).toBe("13時間");
    expect(formatWearMinutes(780, "en")).toBe("13h");
  });
});
