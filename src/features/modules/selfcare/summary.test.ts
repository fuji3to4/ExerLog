import { describe, expect, it } from "vitest";

import type { SelfCareItemId, SelfCareRecord } from "@/lib/types";
import { summarizeSelfCare } from "./summary";

function rec(item: SelfCareItemId, date: string, minutes: number | null = null): SelfCareRecord {
  return { id: `${item}-${date}-${minutes}-${Math.random()}`, date, recordedAt: `${date}T10:00:00+09:00`, item, minutes, note: "", updatedAt: "" };
}

describe("summarizeSelfCare", () => {
  it("returns null when empty", () => {
    expect(summarizeSelfCare([])).toBeNull();
  });

  it("counts distinct days", () => {
    const s = summarizeSelfCare([rec("skincare", "2026-10-01"), rec("skincare", "2026-10-01"), rec("skincare", "2026-10-02")]);
    expect(s?.items).toEqual([{ item: "skincare", days: 2, totalMinutes: null }]);
  });

  it("sums exercise minutes ignoring missing", () => {
    const s = summarizeSelfCare([rec("exercise", "2026-10-01", 30), rec("exercise", "2026-10-02"), rec("exercise", "2026-10-03", 15)]);
    expect(s?.items).toEqual([{ item: "exercise", days: 3, totalMinutes: 45 }]);
  });

  it("orders items and omits empty ones", () => {
    const s = summarizeSelfCare([rec("other", "2026-10-01"), rec("skincare", "2026-10-01")]);
    expect(s?.items.map((i) => i.item)).toEqual(["skincare", "other"]);
  });

  it("has a null total when no exercise record has minutes", () => {
    const s = summarizeSelfCare([rec("exercise", "2026-10-01"), rec("exercise", "2026-10-02")]);
    expect(s?.items).toEqual([{ item: "exercise", days: 2, totalMinutes: null }]);
  });
});
