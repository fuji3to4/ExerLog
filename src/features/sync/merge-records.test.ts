import { describe, expect, test } from "vitest";

import { mergeRecords } from "./merge-records";

describe("mergeRecords", () => {
  test("takes the remote record when its updatedAt is newer", () => {
    const merged = mergeRecords({
      local: [{ id: "a", value: "local", updatedAt: "2026-10-20T10:00:00+09:00" }],
      remote: [{ id: "a", value: "remote", updatedAt: "2026-10-20T11:00:00+09:00" }],
      keyColumn: "id",
      updatedAtKey: "updatedAt",
      deletedIds: new Set(),
    });

    expect(merged).toEqual([{ id: "a", value: "remote", updatedAt: "2026-10-20T11:00:00+09:00" }]);
  });

  test("keeps the local record when it is newer or the timestamps are equal", () => {
    const merged = mergeRecords({
      local: [
        { id: "a", value: "local-newer", updatedAt: "2026-10-20T12:00:00+09:00" },
        { id: "b", value: "local-same", updatedAt: "2026-10-20T12:00:00+09:00" },
      ],
      remote: [
        { id: "a", value: "remote", updatedAt: "2026-10-20T11:00:00+09:00" },
        // Same instant written with a different offset.
        { id: "b", value: "remote-same", updatedAt: "2026-10-20T03:00:00Z" },
      ],
      keyColumn: "id",
      updatedAtKey: "updatedAt",
      deletedIds: new Set(),
    });

    expect(merged.map((r) => r.value)).toEqual(["local-newer", "local-same"]);
  });

  test("keeps ids that exist on only one side", () => {
    const merged = mergeRecords({
      local: [{ id: "local-only", updatedAt: "2026-10-20T10:00:00+09:00" }],
      remote: [{ id: "remote-only", updatedAt: "2026-10-20T10:00:00+09:00" }],
      keyColumn: "id",
      updatedAtKey: "updatedAt",
      deletedIds: new Set(),
    });

    expect(merged.map((r) => r.id).sort()).toEqual(["local-only", "remote-only"]);
  });

  test("drops ids listed in deletedIds from both local and remote", () => {
    const merged = mergeRecords({
      local: [
        { id: "a", updatedAt: "2026-10-20T10:00:00+09:00" },
        { id: "keep", updatedAt: "2026-10-20T10:00:00+09:00" },
      ],
      remote: [
        { id: "a", updatedAt: "2026-10-20T11:00:00+09:00" },
        { id: "b", updatedAt: "2026-10-20T10:00:00+09:00" },
      ],
      keyColumn: "id",
      updatedAtKey: "updatedAt",
      deletedIds: new Set(["a", "b"]),
    });

    expect(merged.map((r) => r.id)).toEqual(["keep"]);
  });

  test("prefers local when updatedAtKey is null", () => {
    const merged = mergeRecords({
      local: [{ id: "ex-1", title: "Local title" }],
      remote: [
        { id: "ex-1", title: "Remote title" },
        { id: "ex-2", title: "Remote only" },
      ],
      keyColumn: "id",
      updatedAtKey: null,
      deletedIds: new Set(),
    });

    expect(merged).toEqual([
      { id: "ex-1", title: "Local title" },
      { id: "ex-2", title: "Remote only" },
    ]);
  });
});
