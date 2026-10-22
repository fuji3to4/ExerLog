import { appDb } from "./app-db";
import {
  listDailySelfCareEntriesByDate,
  replaceDailySelfCareEntries,
} from "./daily-self-care.repository";

beforeEach(async () => {
  await Promise.all([
    appDb.dailySelfCareLogs.clear(),
  ]);
});

test("replaceDailySelfCareEntries replaces all self-care rows for the same day", async () => {
  await replaceDailySelfCareEntries("2026-03-28", [
    {
      selfCareId: "stretching",
      isDone: true,
      count: null,
      minutes: 10,
      note: "",
    },
    {
      selfCareId: "meditation",
      isDone: false,
      count: null,
      minutes: null,
      note: "later",
    },
  ]);

  await replaceDailySelfCareEntries("2026-03-28", [
    {
      selfCareId: "walking",
      isDone: true,
      count: 1,
      minutes: 25,
      note: "",
    },
  ]);

  const entries = await listDailySelfCareEntriesByDate("2026-03-28");

  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    date: "2026-03-28",
    selfCareId: "walking",
    isDone: true,
    count: 1,
    minutes: 25,
    note: "",
  });
  expect(entries[0]?.id).toEqual(expect.any(String));
  expect(entries[0]?.recordedAt).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
  );

  await replaceDailySelfCareEntries("2026-03-28", []);

  expect(await listDailySelfCareEntriesByDate("2026-03-28")).toEqual([]);
});

test("replaceDailySelfCareEntries rejects duplicate self-care ids", async () => {
  await expect(
    replaceDailySelfCareEntries("2026-03-28", [
      {
        selfCareId: "stretching",
        isDone: true,
        count: null,
        minutes: 10,
        note: "",
      },
      {
        selfCareId: "stretching",
        isDone: false,
        count: null,
        minutes: null,
        note: "later",
      },
    ]),
  ).rejects.toThrow("Duplicate selfCareId values in entries array");
});
