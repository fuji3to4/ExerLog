import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { localIsoAt } from "@/lib/date/local-iso";
import { appDb } from "@/features/storage/app-db";
import { addSymptomRecord, deleteSymptomRecord, listSymptomsInRange, symptomsData } from "./data";

beforeEach(async () => {
  await Promise.all([appDb.symptomRecords.clear(), appDb.tombstones.clear()]);
});

const at = localIsoAt("2026-10-05", new Date(2026, 0, 1, 10, 0, 0));

describe("symptoms data", () => {
  it("stores symptoms and sites in canonical order", async () => {
    const rec = await addSymptomRecord({
      date: "2026-10-05",
      recordedAt: at,
      note: " n ",
      symptoms: [
        { id: "pain", severity: 1, sites: ["other", "armRight"], care: null },
        { id: "edema", severity: 2, sites: ["legLeft", "armLeft"], care: null },
      ],
    });
    const stored = await appDb.symptomRecords.get(rec.id);
    expect(stored?.note).toBe("n");
    expect(stored?.symptoms.map((s) => s.id)).toEqual(["edema", "pain"]);
    expect(stored?.symptoms[0].sites).toEqual(["armLeft", "legLeft"]);
    expect(stored?.symptoms[1].sites).toEqual(["armRight", "other"]);
    expect(await listSymptomsInRange("2026-10-05", "2026-10-05")).toHaveLength(1);
  });

  it("records a tombstone on delete", async () => {
    const rec = await addSymptomRecord({ date: "2026-10-05", recordedAt: at, note: "", symptoms: [] });
    await deleteSymptomRecord(rec.id);
    expect(await appDb.symptomRecords.count()).toBe(0);
    const tombs = await appDb.tombstones.toArray();
    expect(tombs.some((t) => t.table === "Symptoms" && t.id.endsWith(rec.id))).toBe(true);
  });

  it("round-trips through the sheet row", async () => {
    const rec = await addSymptomRecord({
      date: "2026-10-05",
      recordedAt: at,
      note: "memo",
      symptoms: [
        { id: "edema", severity: 3, sites: ["armLeft"], care: null },
        { id: "cellulitis", severity: null, sites: ["legRight"], care: "inpatient" },
      ],
    });
    const config = symptomsData.syncConfigs[0];
    const stored = (await appDb.symptomRecords.get(rec.id))!;
    expect(config.fromRow(config.toRow(stored), config.headers)).toEqual(stored);
  });
});
