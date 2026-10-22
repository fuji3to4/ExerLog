import { describe, expect, it } from "vitest";

import { formatMeasurementSummary } from "@/features/measurements/measurement-items";
import type { ExerciseLog, MeasurementRecord, WatchEvent, WellnessEntry } from "@/lib/types";

import { buildTimeline, labelWellness } from "./build-timeline";

const D = "2026-10-20";
const iso = (hhmm: string) => `${D}T${hhmm}:00+09:00`;

function wellness(hhmm: string, id = `w-${hhmm}`): WellnessEntry {
  return {
    id,
    date: D,
    recordedAt: iso(hhmm),
    physicalScore: 3,
    mentalScore: 3,
    note: "",
    updatedAt: iso(hhmm),
  };
}

function watch(hhmm: string, id = `v-${hhmm}`): WatchEvent {
  return { id, date: D, exerciseId: "ex1", watchedAt: iso(hhmm), updatedAt: iso(hhmm) };
}

function measurement(hhmm: string, id = `m-${hhmm}`): MeasurementRecord {
  return { id, date: D, recordedAt: iso(hhmm), values: { weight: 60.2 }, note: "", updatedAt: iso(hhmm) };
}

function log(hhmm: string, id = `l-${hhmm}`): ExerciseLog {
  return {
    id,
    date: D,
    exerciseId: "ex1",
    result: "did",
    performedAt: iso(hhmm),
    durationSeconds: 60,
    updatedAt: iso(hhmm),
  };
}

describe("labelWellness", () => {
  it("labels by time of day when no video is near", () => {
    expect(labelWellness(wellness("07:10"), [], [])).toBe("morning");
    expect(labelWellness(wellness("22:30"), [], [])).toBe("night");
    expect(labelWellness(wellness("00:30"), [], [])).toBeNull();
    expect(labelWellness(wellness("13:00"), [], [])).toBeNull();
  });

  it("labels beforeVideo and afterVideo around a watch", () => {
    const w = [watch("18:03")];
    expect(labelWellness(wellness("18:02"), w, [])).toBe("beforeVideo");
    expect(labelWellness(wellness("18:10"), w, [])).toBe("afterVideo");
    expect(labelWellness(wellness("17:20"), w, [])).toBeNull();
  });

  it("labels afterVideo after an exercise", () => {
    expect(labelWellness(wellness("18:20"), [], [log("18:03")])).toBe("afterVideo");
  });

  it("picks the nearer candidate when both exist", () => {
    const w = [watch("18:00"), watch("18:40")];
    expect(labelWellness(wellness("18:25"), w, [])).toBe("beforeVideo");
  });

  it("prefers afterVideo on a tie", () => {
    const w = [watch("18:00"), watch("18:40")];
    expect(labelWellness(wellness("18:20"), w, [])).toBe("afterVideo");
  });

  it("treats a same-time wellness as beforeVideo", () => {
    expect(labelWellness(wellness("18:03"), [watch("18:03")], [])).toBe("beforeVideo");
  });
});

describe("buildTimeline", () => {
  const titles = new Map([["ex1", "Stretch"]]);

  it("sorts by time, wellness then watch then exercise on ties", () => {
    const items = buildTimeline({
      wellness: [wellness("22:30"), wellness("07:10")],
      watches: [watch("18:03")],
      logs: [log("18:03")],
      measurements: [],
      titles,
    });
    expect(items.map((i) => i.kind)).toEqual(["wellness", "watch", "exercise", "wellness"]);
    expect(items[1]).toMatchObject({ at: iso("18:03"), id: "v-18:03", title: "Stretch" });
  });

  it("falls back to exerciseId when the title is missing", () => {
    const items = buildTimeline({ wellness: [], watches: [watch("09:00")], logs: [], measurements: [], titles: new Map() });
    expect(items[0]).toMatchObject({ kind: "watch", title: "ex1" });
  });

  it("re-labels and re-orders when a wellness time changes", () => {
    const base = { watches: [watch("18:03")], logs: [log("18:03")], measurements: [], titles };
    const a = buildTimeline({ ...base, wellness: [wellness("18:02", "w1")] });
    expect(a.map((i) => i.kind)).toEqual(["wellness", "watch", "exercise"]);
    expect(a[0]).toMatchObject({ label: "beforeVideo" });
    const b = buildTimeline({ ...base, wellness: [wellness("18:30", "w1")] });
    expect(b.map((i) => i.kind)).toEqual(["watch", "exercise", "wellness"]);
    expect(b[2]).toMatchObject({ label: "afterVideo" });
  });

  it("orders measurement between wellness and watch on ties and labels it", () => {
    const items = buildTimeline({
      wellness: [wellness("07:12")],
      watches: [],
      logs: [],
      measurements: [measurement("07:12")],
      titles,
    });
    expect(items.map((i) => i.kind)).toEqual(["wellness", "measurement"]);
    expect(items[1]).toMatchObject({ label: "morning" });
  });

  it("labels a measurement right after a video as afterVideo", () => {
    const items = buildTimeline({
      wellness: [],
      watches: [watch("18:03")],
      logs: [],
      measurements: [measurement("18:10")],
      titles,
    });
    expect(items[1]).toMatchObject({ kind: "measurement", label: "afterVideo" });
  });
});

describe("formatMeasurementSummary", () => {
  it("lists known items in list order and skips unknown ones", () => {
    const t = (key: string) => (key === "measurement_item_weight" ? "体重" : "体脂肪率");
    const record = { ...measurement("07:12"), values: { bodyFat: 22, weight: 60.2, waist: 80 } };
    expect(formatMeasurementSummary(record, t)).toBe("体重 60.2kg・体脂肪率 22.0%");
  });
});
