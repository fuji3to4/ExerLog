import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { scheduleSync } from "@/features/sync/auto-sync";

import { appDb } from "@/features/storage/app-db";
import { listTombstones } from "@/features/storage/tombstones.repository";
import { clearAllRecords } from "@/features/storage/clear-all-records";
import { createMeasurementRepository } from "./measurement-repository";

const repository = createMeasurementRepository(appDb.bodyRecords, "BodyMeasurements");

beforeEach(async () => {
  await Promise.all([appDb.bodyRecords.clear(), appDb.circumferenceRecords.clear(), appDb.tombstones.clear()]);
  vi.mocked(scheduleSync).mockClear();
});

test("exposes its table and tombstone table name", () => {
  expect(repository.table).toBe(appDb.bodyRecords);
  expect(repository.tombstoneTable).toBe("BodyMeasurements");
});

test("add rejects empty values", async () => {
  await expect(repository.add({ date: "2026-10-22", values: {}, note: "" })).rejects.toThrow("empty measurement");
});

test("add trims note, defaults recordedAt and schedules sync", async () => {
  const record = await repository.add({ date: "2026-10-22", values: { weight: 60 }, note: " hi " });
  expect(record.note).toBe("hi");
  expect(record.recordedAt.startsWith("2026-10-22T")).toBe(true);
  expect(scheduleSync).toHaveBeenCalled();
  expect(await appDb.bodyRecords.get(record.id)).toEqual(record);
  expect(await appDb.circumferenceRecords.count()).toBe(0);
});

async function seed() {
  await repository.add({
    date: "2026-10-21",
    values: { height: 170 },
    note: "",
    recordedAt: "2026-10-21T08:00:00+09:00",
  });
  const a = await repository.add({
    date: "2026-10-22",
    values: { weight: 60.2 },
    note: "",
    recordedAt: "2026-10-22T07:12:00+09:00",
  });
  const b = await repository.add({
    date: "2026-10-22",
    values: { weight: 60.8, bodyFat: 22 },
    note: "",
    recordedAt: "2026-10-22T18:00:00+09:00",
  });
  return { a, b };
}

test("listForDay returns the day's records oldest first", async () => {
  const { a, b } = await seed();
  const list = await repository.listForDay("2026-10-22");
  expect(list.map((r) => r.id)).toEqual([a.id, b.id]);
});

test("listInDayRange is inclusive and ordered", async () => {
  await seed();
  const list = await repository.listInDayRange("2026-10-21", "2026-10-22");
  expect(list).toHaveLength(3);
  expect(list[0].values).toEqual({ height: 170 });
});

test("listAll returns every record in instant order, whatever the offset", async () => {
  // As strings, "…T08:00:00+09:00" < "…T09:00:00+00:00" < "…T10:00:00+09:00", but 08:00+09:00 is 23:00 UTC the day
  // before, 10:00+09:00 is 01:00 UTC and 09:00+00:00 is the latest.
  const late = await repository.add({ date: "2026-10-22", values: { weight: 61 }, note: "", recordedAt: "2026-10-22T09:00:00+00:00" });
  const middle = await repository.add({ date: "2026-10-22", values: { weight: 60 }, note: "", recordedAt: "2026-10-22T10:00:00+09:00" });
  const early = await repository.add({ date: "2026-10-22", values: { weight: 59 }, note: "", recordedAt: "2026-10-22T08:00:00+09:00" });
  expect((await repository.listAll()).map((r) => r.id)).toEqual([early.id, middle.id, late.id]);
});

test("findPreviousValues returns the latest earlier value per item", async () => {
  await seed();
  expect(await repository.findPreviousValues("2026-10-22T18:00:00+09:00")).toEqual({
    weight: 60.2,
    height: 170,
  });
});

test("findPreviousValues compares instants, not strings", async () => {
  await seed();
  // 10:00 UTC is 19:00 in +09:00, so the 18:00 (+09:00) record is earlier although its string is larger.
  expect(await repository.findPreviousValues("2026-10-22T10:00:00+00:00")).toEqual({
    weight: 60.8,
    bodyFat: 22,
    height: 170,
  });
});

test("findPreviousValues ignores the excluded record", async () => {
  const { a } = await seed();
  expect(await repository.findPreviousValues("2026-10-22T18:00:00+09:00", { excludeId: a.id })).toEqual({
    height: 170,
  });
});

test("findLatestValueAt returns the newest height at or before the instant, or null", async () => {
  expect(await repository.findLatestValueAt("height", "2026-10-22T18:00:00+09:00")).toBeNull();
  await seed();
  await repository.add({
    date: "2026-10-23",
    values: { height: 171 },
    note: "",
    recordedAt: "2026-10-23T08:00:00+09:00",
  });
  expect(await repository.findLatestValueAt("height", "2026-10-22T18:00:00+09:00")).toBe(170);
  expect(await repository.findLatestValueAt("height", "2026-10-21T08:00:00+09:00")).toBe(170);
  expect(await repository.findLatestValueAt("height", "2026-10-23T08:00:00+09:00")).toBe(171);
  expect(await repository.findLatestValueAt("height", "2026-10-20T00:00:00+09:00")).toBeNull();
});

test("findLatestValueAt ignores the excluded record", async () => {
  const height = await repository.add({
    date: "2026-10-21",
    values: { height: 170 },
    note: "",
    recordedAt: "2026-10-21T08:00:00+09:00",
  });
  expect(
    await repository.findLatestValueAt("height", "2026-10-22T08:00:00+09:00", { excludeId: height.id }),
  ).toBeNull();
});

test("update keeps values outside the item list", async () => {
  const { a } = await seed();
  await repository.update({ ...a, values: { weight: 61, waist: 80 } });
  const [first] = await repository.listForDay("2026-10-22");
  expect(first.values).toEqual({ weight: 61, waist: 80 });
});

test("remove records a tombstone under the repository's tab name", async () => {
  const { a } = await seed();
  await repository.remove(a.id);
  expect(await appDb.bodyRecords.get(a.id)).toBeUndefined();
  expect(await listTombstones()).toContainEqual(
    expect.objectContaining({ id: `BodyMeasurements:${a.id}`, table: "BodyMeasurements", recordId: a.id }),
  );
});

test("clearAllRecords empties body records and keeps tombstones", async () => {
  const { a } = await seed();
  await clearAllRecords();
  expect(await appDb.bodyRecords.count()).toBe(0);
  expect(await listTombstones()).toContainEqual(
    expect.objectContaining({ table: "BodyMeasurements", recordId: a.id }),
  );
});
