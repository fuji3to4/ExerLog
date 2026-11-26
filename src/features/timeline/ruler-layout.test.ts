import { describe, expect, it } from "vitest";

import type { TimelineItem } from "./build-timeline";
import { earliestHour, layoutRuler } from "./ruler-layout";

const D = "2026-10-20";
const iso = (hhmm: string) => `${D}T${hhmm}:00+09:00`;
const opts = { start: 6, span: 18 };

function mod(moduleId: string, hhmm: string, endedAt?: string | null, id = `${moduleId}-${hhmm}`): TimelineItem {
  const at = iso(hhmm);
  return { kind: "module", moduleId, id, at, record: { id, date: D, recordedAt: at, endedAt }, label: null };
}

function ex(hhmm: string, durationSeconds: number, id = `ex-${hhmm}`): TimelineItem {
  return {
    kind: "exercise",
    id,
    at: iso(hhmm),
    log: { id, date: D, exerciseId: "e1", result: "did", performedAt: iso(hhmm), durationSeconds, updatedAt: iso(hhmm) },
    title: "t",
  };
}

function watch(hhmm: string, id = `v-${hhmm}`): TimelineItem {
  return {
    kind: "watch",
    id,
    at: iso(hhmm),
    event: { id, date: D, exerciseId: "e1", watchedAt: iso(hhmm), updatedAt: iso(hhmm) },
    title: "t",
  };
}

const only = (items: TimelineItem[], o: Parameters<typeof layoutRuler>[1] = opts) => layoutRuler(items, o).clips[0];

describe("layoutRuler", () => {
  it("exercise width comes from durationSeconds", () => {
    const c = only([ex("09:00", 1800)]);
    expect(c.x).toBeCloseTo(2.5 / 18);
    expect(c.width).toBeCloseTo(0.5 / 18);
    expect(c.isPoint).toBe(false);
  });

  it("exercise ends at performedAt", () => {
    const c = only([ex("12:00", 1800)]);
    expect(c.x + c.width).toBeCloseTo(6 / 18);
  });

  it("exercise starting before the ruler start is clamped", () => {
    const c = only([ex("06:30", 3600)]);
    expect(c.x).toBe(0);
    expect(c.width).toBeCloseTo(0.5 / 18);
  });

  it("module with endedAt is a band", () => {
    expect(only([mod("compression", "08:00", iso("18:00"))]).width).toBeCloseTo(10 / 18);
  });

  it("module with endedAt null is a point even on today", () => {
    // A stale nowHours from the old signature must be ignored: the record never runs to now.
    const staleNow = { ...opts, nowHours: 12 } as typeof opts;
    const c = only([mod("compression", "08:00", null)], staleNow);
    expect(c.width).toBe(0);
    expect(c.isPoint).toBe(true);
  });

  it("open-ended module is a point on a past day", () => {
    const c = only([mod("compression", "08:00", null)]);
    expect(c.width).toBe(0);
    expect(c.isPoint).toBe(true);
  });

  it("module without an endedAt property is a point even on today", () => {
    const c = only([mod("wellness", "08:00")]);
    expect(c.isPoint).toBe(true);
    expect(c.width).toBe(0);
  });

  it("endedAt before recordedAt is a point", () => {
    expect(only([mod("compression", "10:00", iso("09:00"))]).isPoint).toBe(true);
  });

  it("endedAt on the next day is clipped to the ruler end", () => {
    const c = only([mod("compression", "20:00", "2026-10-21T07:00:00+09:00")]);
    expect(c.x + c.width).toBeCloseTo(1);
    expect(c.isPoint).toBe(false);
  });

  it("watch is a point", () => {
    expect(only([watch("10:00")]).isPoint).toBe(true);
  });

  it("same group overlap shares a row", () => {
    const r = layoutRuler([mod("compression", "08:00", iso("12:00")), mod("compression", "10:00", iso("14:00"))], opts);
    expect(r.clips.map((c) => c.row)).toEqual([0, 0]);
    expect(r.rows).toBe(1);
  });

  it("different module inside a band drops a row", () => {
    const r = layoutRuler([mod("compression", "08:00", iso("18:00")), mod("wellness", "10:00")], opts);
    expect(r.clips.find((c) => c.item.kind === "module" && c.item.moduleId === "wellness")?.row).toBe(1);
  });

  it("exercises never stack", () => {
    const r = layoutRuler([ex("09:00", 3600), ex("09:30", 3600)], opts);
    expect(r.clips.map((c) => c.row)).toEqual([0, 0]);
  });

  it("different-module points at the same minute stack", () => {
    const r = layoutRuler([mod("wellness", "10:00"), mod("measurement", "10:00")], opts);
    expect(r.clips.map((c) => c.row)).toEqual([0, 1]);
  });

  it("points close together do not stack", () => {
    const r = layoutRuler([mod("wellness", "10:00"), mod("measurement", "10:05")], opts);
    expect(r.clips.map((c) => c.row)).toEqual([0, 0]);
  });

  it("lanes keep kind order", () => {
    const r = layoutRuler([watch("07:00"), ex("09:00", 60), mod("wellness", "11:00")], opts);
    const rowOf = (kind: string) => r.clips.find((c) => c.item.kind === kind)?.row;
    expect([rowOf("module"), rowOf("exercise"), rowOf("watch")]).toEqual([0, 1, 2]);
    expect(r.rows).toBe(3);
  });

  it("different-group bands whose ends touch share a row", () => {
    const r = layoutRuler([mod("compression", "08:00", iso("10:00")), mod("wellness", "10:00", iso("12:00"))], opts);
    expect(r.clips.map((c) => c.row)).toEqual([0, 0]);
  });

  it("same-group clip returns to row 0 after a different group pushed an earlier clip down", () => {
    const r = layoutRuler(
      [mod("compression", "08:00", iso("18:00")), mod("wellness", "10:00"), mod("wellness", "19:00")],
      opts,
    );
    expect(r.clips.map((c) => c.row)).toEqual([0, 1, 0]);
  });

  it("overlap uses the shifted exercise interval", () => {
    const r = layoutRuler([ex("09:00", 3600), ex("10:30", 3600)], opts);
    expect(r.clips.map((c) => c.row)).toEqual([0, 0]);
  });
});

describe("earliestHour", () => {
  it("uses at minus duration for exercises", () => {
    expect(earliestHour([ex("09:00", 7200), mod("wellness", "08:00")])).toBeCloseTo(7);
  });

  it("is Infinity for an empty list", () => {
    expect(earliestHour([])).toBe(Infinity);
  });
});
