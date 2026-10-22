import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { scheduleSync } from "@/features/sync/auto-sync";

import { appDb } from "./app-db";
import {
  addMeasurement,
  deleteMeasurement,
  findLatestHeightAt,
  findPreviousValues,
  getLatestMeasurementValues,
  listMeasurementsForDay,
  listMeasurementsInRange,
  updateMeasurement,
} from "./measurements.repository";
import { listTombstones } from "./tombstones.repository";
import { clearAllRecords } from "./clear-all-records";

beforeEach(async () => {
  await Promise.all([appDb.measurements.clear(), appDb.tombstones.clear()]);
  vi.mocked(scheduleSync).mockClear();
});

test("addMeasurement rejects empty values", async () => {
  await expect(addMeasurement({ date: "2026-10-22", values: {}, note: "" })).rejects.toThrow(
    "empty measurement",
  );
});

test("addMeasurement trims note, defaults recordedAt and schedules sync", async () => {
  const record = await addMeasurement({ date: "2026-10-22", values: { weight: 60 }, note: " hi " });
  expect(record.note).toBe("hi");
  expect(record.recordedAt.startsWith("2026-10-22T")).toBe(true);
  expect(scheduleSync).toHaveBeenCalled();
});

async function seed() {
  await addMeasurement({
    date: "2026-10-21",
    values: { height: 170 },
    note: "",
    recordedAt: "2026-10-21T08:00:00+09:00",
  });
  const a = await addMeasurement({
    date: "2026-10-22",
    values: { weight: 60.2 },
    note: "",
    recordedAt: "2026-10-22T07:12:00+09:00",
  });
  const b = await addMeasurement({
    date: "2026-10-22",
    values: { weight: 60.8, bodyFat: 22 },
    note: "",
    recordedAt: "2026-10-22T18:00:00+09:00",
  });
  return { a, b };
}

test("listMeasurementsForDay returns the day's records oldest first", async () => {
  const { a, b } = await seed();
  const list = await listMeasurementsForDay("2026-10-22");
  expect(list.map((r) => r.id)).toEqual([a.id, b.id]);
});

test("listMeasurementsInRange is inclusive and ordered", async () => {
  await seed();
  const list = await listMeasurementsInRange("2026-10-21", "2026-10-22");
  expect(list).toHaveLength(3);
  expect(list[0].values).toEqual({ height: 170 });
});

test("findPreviousValues returns the latest earlier value per item", async () => {
  await seed();
  expect(await findPreviousValues("2026-10-22T18:00:00+09:00")).toEqual({
    weight: 60.2,
    height: 170,
  });
});

test("findLatestHeightAt returns null when no height is recorded", async () => {
  expect(await findLatestHeightAt("2026-10-22T18:00:00+09:00")).toBeNull();
  await seed();
  expect(await findLatestHeightAt("2026-10-22T18:00:00+09:00")).toBe(170);
  expect(await findLatestHeightAt("2026-10-20T00:00:00+09:00")).toBeNull();
});

test("getLatestMeasurementValues gives the newest value per item", async () => {
  await seed();
  expect(await getLatestMeasurementValues()).toEqual({
    height: { value: 170, recordedAt: "2026-10-21T08:00:00+09:00" },
    weight: { value: 60.8, recordedAt: "2026-10-22T18:00:00+09:00" },
    bodyFat: { value: 22, recordedAt: "2026-10-22T18:00:00+09:00" },
  });
});

test("updateMeasurement keeps values outside the item list", async () => {
  const { a } = await seed();
  await updateMeasurement({ ...a, values: { weight: 61, waist: 80 } });
  const [first] = await listMeasurementsForDay("2026-10-22");
  expect(first.values).toEqual({ weight: 61, waist: 80 });
});

test("deleteMeasurement records a tombstone", async () => {
  const { a } = await seed();
  await deleteMeasurement(a.id);
  expect(await appDb.measurements.get(a.id)).toBeUndefined();
  expect(await listTombstones()).toContainEqual(
    expect.objectContaining({ table: "Measurements", recordId: a.id }),
  );
});

test("clearAllRecords empties measurements and keeps tombstones", async () => {
  const { a } = await seed();
  await clearAllRecords();
  expect(await appDb.measurements.count()).toBe(0);
  expect(await listTombstones()).toContainEqual(
    expect.objectContaining({ table: "Measurements", recordId: a.id }),
  );
});
