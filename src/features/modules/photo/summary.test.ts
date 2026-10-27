import { describe, expect, it } from "vitest";

import type { PhotoRecord } from "@/lib/types";
import { summarizePhotos } from "./summary";

const rec = (id: string, recordedAt: string, photoIds: string[]): PhotoRecord => ({
  id,
  date: recordedAt.slice(0, 10),
  recordedAt,
  note: "",
  photoIds,
  updatedAt: recordedAt,
});

describe("summarizePhotos", () => {
  it("counts records and photos in time order", () => {
    const late = rec("b", "2026-10-21T08:00:00+09:00", ["1", "2", "3"]);
    const early = rec("a", "2026-10-20T08:00:00+09:00", ["4"]);
    const summary = summarizePhotos([late, early]);
    expect(summary).toEqual({ count: 2, photoCount: 4, records: [early, late] });
  });

  it("is null when empty", () => {
    expect(summarizePhotos([])).toBeNull();
  });
});
