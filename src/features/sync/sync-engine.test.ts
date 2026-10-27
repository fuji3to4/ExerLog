import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

/** A stub file-sync module that replaces the real one (photo) in the registry only while a test sets it. */
const fileSyncModule = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
vi.mock("@/features/modules/data-registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/modules/data-registry")>();
  return {
    ...actual,
    recordModuleData: () =>
      fileSyncModule.current
        ? [...actual.recordModuleData().map(({ syncFiles: _real, ...rest }) => rest), fileSyncModule.current]
        : actual.recordModuleData(),
  };
});

import type { ExerciseLog, MeasurementRecord, Tombstone } from "@/lib/types";
import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { appDb } from "@/features/storage/app-db";
import { clearAllExercises, seedIfEmpty } from "@/features/storage/exercise-catalog.repository";
import { CIRCUMFERENCE_ITEMS } from "@/features/measurements/measurement-items";
import { sheetTabs, tableSyncConfigs } from "./sync-config";
import { syncAll } from "./sync-engine";

const TOKEN = "fake-token";
const SPREADSHEET_ID = "sheet123";

const EXERCISE_LOG_HEADERS = [
  "id",
  "date",
  "exerciseId",
  "result",
  "performedAt",
  "durationSeconds",
  "updatedAt",
];

/** In-memory fake of the parts of the Drive / Sheets REST API that sync uses. */
class FakeSheets {
  tabs = new Map<string, string[][]>();
  spreadsheetExists = true;
  failWritesFor = new Set<string>();
  /** Column count per tab; a tab not listed has the 26 (A–Z) a new tab gets. */
  columnCounts = new Map<string, number>();
  failColumnGrow = false;
  calls: { method: string; url: string }[] = [];

  constructor() {
    for (const tab of sheetTabs()) this.tabs.set(tab, []);
  }

  handle = async (input: string, init?: { method?: string; body?: string }) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    this.calls.push({ method, url });

    if (url.startsWith("https://www.googleapis.com/drive/v3/files")) {
      return json({ files: this.spreadsheetExists ? [{ id: SPREADSHEET_ID }] : [] });
    }

    const valuesMatch = url.match(/\/spreadsheets\/[^/]+\/values\/([^?]+)/);
    if (valuesMatch) {
      const rawRange = valuesMatch[1];
      const isClear = rawRange.endsWith(":clear");
      const range = decodeURIComponent(isClear ? rawRange.slice(0, -":clear".length) : rawRange);
      const tab = range.split("!")[0];
      if (method === "GET") {
        const rows = this.tabs.get(tab) ?? [];
        return json(rows.length ? { values: rows } : {});
      }
      if (this.failWritesFor.has(tab)) {
        return { ok: false, status: 500, json: async () => ({}), text: async () => "boom" };
      }
      if (method === "POST" && isClear) {
        this.tabs.set(tab, []);
        return json({});
      }
      if (method === "PUT") {
        const values: string[][] = JSON.parse(init!.body!).values;
        const width = Math.max(0, ...values.map((row) => row.length));
        if (width > this.columnCount(tab)) {
          return {
            ok: false,
            status: 400,
            json: async () => ({}),
            text: async () => "Range exceeds grid limits",
          };
        }
        this.tabs.set(tab, values);
        return json({});
      }
    }

    if (url.includes(`/spreadsheets/${SPREADSHEET_ID}?fields=`)) {
      return json({
        sheets: [...this.tabs.keys()].map((title, sheetId) => ({
          properties: { sheetId, title, gridProperties: { columnCount: this.columnCount(title) } },
        })),
      });
    }

    if (url.endsWith(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`) && method === "POST") {
      const titles = [...this.tabs.keys()];
      for (const request of JSON.parse(init!.body!).requests) {
        if (request.appendDimension) {
          if (this.failColumnGrow) {
            return { ok: false, status: 500, json: async () => ({}), text: async () => "boom" };
          }
          const { sheetId, dimension, length } = request.appendDimension;
          expect(dimension).toBe("COLUMNS");
          const title = titles[sheetId];
          this.columnCounts.set(title, this.columnCount(title) + length);
        } else if (request.addSheet) {
          this.tabs.set(request.addSheet.properties.title, []);
        }
      }
      return json({ replies: [] });
    }

    if (url === "https://sheets.googleapis.com/v4/spreadsheets" && method === "POST") {
      this.spreadsheetExists = true;
      for (const sheet of JSON.parse(init!.body!).sheets) this.tabs.set(sheet.properties.title, []);
      return json({ spreadsheetId: SPREADSHEET_ID });
    }

    throw new Error(`Unexpected fetch ${method} ${url}`);
  };

  columnCount(tab: string): number {
    return this.columnCounts.get(tab) ?? 26;
  }
}

function json(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
}

function makeLog(overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    id: "log-1",
    date: "2026-10-20",
    exerciseId: "neck-mobility-5",
    result: "done",
    performedAt: "2026-10-20T09:00:00+09:00",
    durationSeconds: 300,
    updatedAt: "2026-10-20T09:00:00+09:00",
    ...overrides,
  };
}

function logRow(log: ExerciseLog): string[] {
  return [
    log.id,
    log.date,
    log.exerciseId,
    log.result,
    log.performedAt,
    String(log.durationSeconds),
    log.updatedAt,
  ];
}

const MEASUREMENT_FIXED = ["id", "date", "recordedAt", "note", "updatedAt"];
const BODY_HEADERS = [...MEASUREMENT_FIXED, "weight", "bodyFat", "height"];
const CIRCUMFERENCE_HEADERS = [...MEASUREMENT_FIXED, ...CIRCUMFERENCE_ITEMS.map((item) => item.id)];

/** n empty item cells. */
function blanks(n: number): string[] {
  return Array.from({ length: n }, () => "");
}

function makeMeasurement(overrides: Partial<MeasurementRecord> = {}): MeasurementRecord {
  return {
    id: "m-1",
    date: "2026-10-20",
    recordedAt: "2026-10-20T07:00:00+09:00",
    values: { weight: 60 },
    note: "",
    updatedAt: "2026-10-20T07:00:00+09:00",
    ...overrides,
  };
}

/** Fixed columns of a measurement row, in MEASUREMENT_FIXED order. */
function measurementFixedCells(record: MeasurementRecord): string[] {
  return [record.id, record.date, record.recordedAt, record.note, record.updatedAt];
}

let sheets: FakeSheets;

beforeEach(async () => {
  await Promise.all(appDb.tables.map((table) => table.clear()));
  sheets = new FakeSheets();
  vi.stubGlobal("fetch", vi.fn(sheets.handle));
  // Failure-path tests log expected errors; keep the output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
  fileSyncModule.current = null;
});

describe("syncAll", () => {
  test("a record deleted locally disappears from both local and the sheet", async () => {
    const tombstone: Tombstone = {
      id: "ExerciseLogs:log-1",
      table: "ExerciseLogs",
      recordId: "log-1",
      deletedAt: "2026-10-20T10:00:00+09:00",
    };
    await appDb.tombstones.put(tombstone);
    sheets.tabs.set("ExerciseLogs", [EXERCISE_LOG_HEADERS, logRow(makeLog())]);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(await appDb.exerciseLogs.toArray()).toEqual([]);
    expect(sheets.tabs.get("ExerciseLogs")).toEqual([EXERCISE_LOG_HEADERS]);
    expect(sheets.tabs.get("Tombstones")).toEqual([
      ["id", "table", "recordId", "deletedAt"],
      ["ExerciseLogs:log-1", "ExerciseLogs", "log-1", "2026-10-20T10:00:00+09:00"],
    ]);
    expect(await appDb.tombstones.toArray()).toEqual([tombstone]);
  });

  test("a tombstone that only exists on the sheet deletes the local record", async () => {
    await appDb.exerciseLogs.put(makeLog());
    sheets.tabs.set("Tombstones", [
      ["id", "table", "recordId", "deletedAt"],
      ["ExerciseLogs:log-1", "ExerciseLogs", "log-1", "2026-10-20T10:00:00+09:00"],
    ]);

    await syncAll(TOKEN);

    expect(await appDb.exerciseLogs.toArray()).toEqual([]);
    expect(await appDb.tombstones.count()).toBe(1);
  });

  test("a record deleted while the sync is running is not resurrected", async () => {
    const log = makeLog();
    await appDb.exerciseLogs.put(log);
    await syncAll(TOKEN);
    expect(sheets.tabs.get("ExerciseLogs")).toEqual([EXERCISE_LOG_HEADERS, logRow(log)]);

    const handle = sheets.handle;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        const isLogsRead =
          (init?.method ?? "GET") === "GET" &&
          decodeURIComponent(url).includes("/values/ExerciseLogs!");
        if (isLogsRead) {
          // The user deletes the record after the Tombstones tab was merged.
          await appDb.transaction("rw", appDb.exerciseLogs, appDb.tombstones, async () => {
            await appDb.exerciseLogs.delete(log.id);
            await appDb.tombstones.put({
              id: `ExerciseLogs:${log.id}`,
              table: "ExerciseLogs",
              recordId: log.id,
              deletedAt: "2026-10-20T11:00:00+09:00",
            });
          });
        }
        return handle(url, init);
      }),
    );

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(await appDb.exerciseLogs.toArray()).toEqual([]);
    expect(sheets.tabs.get("ExerciseLogs")).toEqual([EXERCISE_LOG_HEADERS]);
  });

  test("a locally edited time reaches the sheet row", async () => {
    const original = makeLog();
    const edited = makeLog({
      performedAt: "2026-10-20T07:30:00+09:00",
      updatedAt: "2026-10-20T12:00:00+09:00",
    });
    await appDb.exerciseLogs.put(edited);
    sheets.tabs.set("ExerciseLogs", [EXERCISE_LOG_HEADERS, logRow(original)]);

    await syncAll(TOKEN);

    expect(sheets.tabs.get("ExerciseLogs")).toEqual([EXERCISE_LOG_HEADERS, logRow(edited)]);
    expect(await appDb.exerciseLogs.toArray()).toEqual([edited]);
  });

  test("a newer remote edit and remote-only records are pulled into local", async () => {
    await appDb.exerciseLogs.put(makeLog());
    const remoteNewer = makeLog({ result: "partial", updatedAt: "2026-10-20T13:00:00+09:00" });
    const remoteOnly = makeLog({ id: "log-2", durationSeconds: 90 });
    sheets.tabs.set("ExerciseLogs", [EXERCISE_LOG_HEADERS, logRow(remoteNewer), logRow(remoteOnly)]);

    await syncAll(TOKEN);

    const local = await appDb.exerciseLogs.orderBy("id").toArray();
    expect(local).toEqual([remoteNewer, remoteOnly]);
  });

  test("an old-format tab does not throw and is rewritten with the new headers", async () => {
    await appDb.wellnessEntries.put({
      id: "w-1",
      date: "2026-10-20",
      recordedAt: "2026-10-20T08:00:00+09:00",
      physicalScore: 4,
      mentalScore: 3,
      note: "",
      updatedAt: "2026-10-20T08:00:00+09:00",
    });
    sheets.tabs.set("WellnessEntries", [
      ["date", "physicalScore", "mentalScore", "note", "updatedAt"],
      ["2026-10-19", "2", "2", "old", "2026-10-19T08:00:00+09:00"],
    ]);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(sheets.tabs.get("WellnessEntries")).toEqual([
      ["id", "date", "recordedAt", "physicalScore", "mentalScore", "note", "updatedAt"],
      ["w-1", "2026-10-20", "2026-10-20T08:00:00+09:00", "4", "3", "", "2026-10-20T08:00:00+09:00"],
    ]);
    expect(await appDb.wellnessEntries.count()).toBe(1);
  });

  test("exercises re-seeded after 'delete all' survive sync locally and on the sheet", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-20T09:00:00+09:00"));
    await seedIfEmpty();
    await syncAll(TOKEN);

    vi.setSystemTime(new Date("2026-10-20T10:00:00+09:00"));
    await clearAllExercises();
    await syncAll(TOKEN);
    expect(sheets.tabs.get("Exercises")).toHaveLength(1);

    vi.setSystemTime(new Date("2026-10-20T11:00:00+09:00"));
    await seedIfEmpty();
    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(await appDb.exercises.count()).toBe(exerciseCatalog.length);
    expect(sheets.tabs.get("Exercises")).toHaveLength(exerciseCatalog.length + 1);
    expect(await appDb.tombstones.where("table").equals("Exercises").count()).toBe(
      exerciseCatalog.length,
    );
  });

  test.each(["read", "write"] as const)(
    "a failed Tombstones %s stops the run before any other tab is synced",
    async (failure) => {
      await appDb.tombstones.put({
        id: "ExerciseLogs:log-1",
        table: "ExerciseLogs",
        recordId: "log-1",
        deletedAt: "2026-10-20T10:00:00+09:00",
      });
      sheets.tabs.set("ExerciseLogs", [EXERCISE_LOG_HEADERS, logRow(makeLog())]);
      const handle = sheets.handle;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
          const method = init?.method ?? "GET";
          const isTombstones = decodeURIComponent(url).includes("/values/Tombstones!");
          if (isTombstones && (failure === "read" ? method === "GET" : method !== "GET")) {
            return { ok: false, status: 500, json: async () => ({}), text: async () => "boom" };
          }
          return handle(url, init);
        }),
      );

      const result = await syncAll(TOKEN);

      expect(result.success).toBe(false);
      expect(result.results.map((r) => r.tableName)).toEqual(["Tombstones"]);
      expect(result.results[0].error).toBeDefined();
      expect(await appDb.exerciseLogs.count()).toBe(0);
      expect(sheets.tabs.get("ExerciseLogs")).toEqual([EXERCISE_LOG_HEADERS, logRow(makeLog())]);
      expect(
        sheets.calls.some((c) => decodeURIComponent(c.url).includes("/values/ExerciseLogs!")),
      ).toBe(false);
    },
  );

  test("syncs every tab, Tombstones first, and reports row counts", async () => {
    await appDb.exerciseLogs.put(makeLog());
    const progress: string[] = [];

    const result = await syncAll(TOKEN, (r) => progress.push(r.tableName));

    expect(result.success).toBe(true);
    expect(result.spreadsheetId).toBe(SPREADSHEET_ID);
    expect(progress[0]).toBe("Tombstones");
    expect([...progress].sort()).toEqual([...sheetTabs(), "PhotoDrive"].sort());
    expect(result.results.find((r) => r.tableName === "ExerciseLogs")).toEqual({
      tableName: "ExerciseLogs",
      rowCount: 1,
    });
    for (const config of tableSyncConfigs()) {
      const written = config.headerMode === "byName" ? config.buildHeaders!([]) : config.headers;
      expect(sheets.tabs.get(config.tabName)?.[0]).toEqual(written);
    }
  });

  test("runs syncFiles right after Tombstones and before other tabs; its failure marks success false but other tabs still sync", async () => {
    await appDb.exerciseLogs.put(makeLog());
    sheets.tabs.set("Tombstones", [
      ["id", "table", "recordId", "deletedAt"],
      ["WatchEvents:w-1", "WatchEvents", "w-1", "2026-10-20T10:00:00+09:00"],
    ]);
    const progress: string[] = [];
    let tombstonesSeenByFileSync = -1;
    const syncFiles = vi.fn(async (token: string) => {
      expect(token).toBe(TOKEN);
      tombstonesSeenByFileSync = await appDb.tombstones.count();
      return { tableName: "PhotoDrive", rowCount: 0, error: "upload failed" };
    });
    fileSyncModule.current = {
      id: "stub",
      syncConfigs: [],
      tables: () => [],
      syncFiles,
    };

    const result = await syncAll(TOKEN, (r) => progress.push(r.tableName));

    expect(syncFiles).toHaveBeenCalledTimes(1);
    expect(tombstonesSeenByFileSync).toBe(1);
    expect(progress.slice(0, 2)).toEqual(["Tombstones", "PhotoDrive"]);
    expect([...progress.slice(2)].sort()).toEqual(sheetTabs().filter((t) => t !== "Tombstones").sort());
    expect(result.results[1]).toEqual({ tableName: "PhotoDrive", rowCount: 0, error: "upload failed" });
    expect(result.success).toBe(false);
    expect(result.results.find((r) => r.tableName === "ExerciseLogs")).toEqual({
      tableName: "ExerciseLogs",
      rowCount: 1,
    });
    expect(sheets.tabs.get("ExerciseLogs")).toHaveLength(2);
  });

  test("a syncFiles that throws is reported under the module id and the other tabs still sync", async () => {
    fileSyncModule.current = {
      id: "stub",
      syncConfigs: [],
      tables: () => [],
      syncFiles: async () => {
        throw new Error("drive down");
      },
    };

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(false);
    expect(result.results[1]).toEqual({ tableName: "stub", rowCount: 0, error: "drive down" });
    expect(result.results).toHaveLength(sheetTabs().length + 1);
  });

  test("syncFiles is not called when the Tombstones merge fails", async () => {
    const syncFiles = vi.fn();
    fileSyncModule.current = { id: "stub", syncConfigs: [], tables: () => [], syncFiles };
    sheets.failWritesFor.add("Tombstones");

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(false);
    expect(syncFiles).not.toHaveBeenCalled();
  });

  test("creates the spreadsheet with every tab when none exists", async () => {
    sheets.spreadsheetExists = false;
    sheets.tabs.clear();

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect([...sheets.tabs.keys()].sort()).toEqual([...sheetTabs()].sort());
  });

  test("a failed sheet write is reported for that table and the next tables still sync", async () => {
    await appDb.exerciseLogs.put(makeLog());
    await appDb.watchEvents.put({
      id: "watch-1",
      date: "2026-10-20",
      exerciseId: "neck-mobility-5",
      watchedAt: "2026-10-20T09:00:00+09:00",
      updatedAt: "2026-10-20T09:00:00+09:00",
    });
    sheets.failWritesFor.add("ExerciseLogs");

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(false);
    expect(result.results.find((r) => r.tableName === "ExerciseLogs")?.error).toBeDefined();
    expect(result.results.find((r) => r.tableName === "WatchEvents")?.error).toBeUndefined();
    expect(sheets.tabs.get("WatchEvents")).toHaveLength(2);
  });

  test("a failed sheet read leaves the sheet untouched for that table", async () => {
    sheets.tabs.set("ExerciseLogs", [EXERCISE_LOG_HEADERS, logRow(makeLog())]);
    const handle = sheets.handle;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        if ((init?.method ?? "GET") === "GET" && decodeURIComponent(url).includes("/values/ExerciseLogs!")) {
          return { ok: false, status: 500, json: async () => ({}), text: async () => "boom" };
        }
        return handle(url, init);
      }),
    );

    const result = await syncAll(TOKEN);

    expect(result.results.find((r) => r.tableName === "ExerciseLogs")?.error).toBeDefined();
    expect(sheets.tabs.get("ExerciseLogs")).toEqual([EXERCISE_LOG_HEADERS, logRow(makeLog())]);
  });

  test("returns failure when the spreadsheet cannot be created", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("https://www.googleapis.com/drive/v3/files")) return json({ files: [] });
        return { ok: false, status: 500, json: async () => ({}), text: async () => "boom" };
      }),
    );

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(false);
    expect(result.results[0]).toEqual({
      tableName: "spreadsheet",
      rowCount: 0,
      error: "Failed to create spreadsheet",
    });
  });

  test("queues concurrent calls so they never overlap", async () => {
    let active = 0;
    let maxActive = 0;
    const handle = sheets.handle;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        if (url.startsWith("https://www.googleapis.com/drive/v3/files")) {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        if (url.includes("/values/SelfCareCatalog") && init?.method === "PUT") {
          active--;
        }
        return handle(url, init);
      }),
    );

    const [first, second] = await Promise.all([syncAll(TOKEN), syncAll(TOKEN)]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(maxActive).toBe(1);
  });
});

describe("syncAll: BodyMeasurements and Circumference tabs", () => {
  test("a sheet missing item columns is merged and rewritten with every item column", async () => {
    const remote = makeMeasurement({ id: "m-1", values: { weight: 60 } });
    const local = makeMeasurement({
      id: "m-2",
      recordedAt: "2026-10-20T21:00:00+09:00",
      values: { bodyFat: 22 },
      updatedAt: "2026-10-20T21:00:00+09:00",
    });
    await appDb.bodyRecords.put(local);
    sheets.tabs.set("BodyMeasurements", [
      [...MEASUREMENT_FIXED, "weight"],
      [...measurementFixedCells(remote), "60"],
    ]);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(await appDb.bodyRecords.orderBy("id").toArray()).toEqual([remote, local]);
    expect(sheets.tabs.get("BodyMeasurements")).toEqual([
      BODY_HEADERS,
      [...measurementFixedCells(remote), "60", ...blanks(2)],
      [...measurementFixedCells(local), "", "22", ...blanks(1)],
    ]);
  });

  test("a column not in the item list is kept; non-numeric cells are dropped", async () => {
    const first = makeMeasurement({ id: "m-1", values: { weight: 60, waist: 80 } });
    const second = makeMeasurement({ id: "m-2", values: { weight: 61 } });
    sheets.tabs.set("BodyMeasurements", [
      [...MEASUREMENT_FIXED, "weight", "waist"],
      [...measurementFixedCells(first), "60", "80"],
      [...measurementFixedCells(second), "61", "abc"],
    ]);

    await syncAll(TOKEN);

    expect(await appDb.bodyRecords.orderBy("id").toArray()).toEqual([first, second]);
    expect(sheets.tabs.get("BodyMeasurements")).toEqual([
      [...BODY_HEADERS, "waist"],
      [...measurementFixedCells(first), "60", ...blanks(2), "80"],
      [...measurementFixedCells(second), "61", ...blanks(3)],
    ]);
  });

  test("a sheet missing a fixed column is treated as empty and rewritten", async () => {
    const local = makeMeasurement();
    await appDb.bodyRecords.put(local);
    sheets.tabs.set("BodyMeasurements", [
      ["id", "date", "weight"],
      ["m-9", "2026-10-19", "70"],
    ]);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(await appDb.bodyRecords.toArray()).toEqual([local]);
    expect(sheets.tabs.get("BodyMeasurements")).toEqual([
      BODY_HEADERS,
      [...measurementFixedCells(local), "60", ...blanks(2)],
    ]);
  });

  test("circumference records go to the Circumference tab with every circumference column", async () => {
    const local = makeMeasurement({ id: "c-1", values: { armWristLeft: 15 } });
    await appDb.circumferenceRecords.put(local);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    const rows = sheets.tabs.get("Circumference")!;
    expect(rows[0]).toEqual(CIRCUMFERENCE_HEADERS);
    expect(rows[1][CIRCUMFERENCE_HEADERS.indexOf("armWristLeft")]).toBe("15");
    expect(sheets.tabs.get("BodyMeasurements")).toEqual([BODY_HEADERS]);
    expect(await appDb.bodyRecords.count()).toBe(0);
  });

  test("a write wider than 26 columns widens the tab first and keeps the data", async () => {
    const local = makeMeasurement({ id: "c-1", values: { armWristLeft: 15, extraA: 1, extraB: 2 } });
    await appDb.circumferenceRecords.put(local);
    const headers = [...CIRCUMFERENCE_HEADERS, "extraA", "extraB"];
    expect(headers.length).toBeGreaterThan(26);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(sheets.columnCount("Circumference")).toBe(headers.length);
    expect(sheets.tabs.get("Circumference")?.[0]).toEqual(headers);
    expect(await appDb.circumferenceRecords.toArray()).toEqual([local]);
  });

  test("when widening the tab fails, nothing is cleared", async () => {
    const remote = makeMeasurement({ id: "c-1", values: { armWristLeft: 15, extraA: 1, extraB: 2 } });
    const remoteRows = [
      [...MEASUREMENT_FIXED, "armWristLeft", "extraA", "extraB"],
      [...measurementFixedCells(remote), "15", "1", "2"],
    ];
    sheets.tabs.set("Circumference", remoteRows);
    sheets.failColumnGrow = true;

    const result = await syncAll(TOKEN);

    expect(result.results.find((r) => r.tableName === "Circumference")?.error).toBeDefined();
    expect(sheets.tabs.get("Circumference")).toEqual(remoteRows);
    expect(
      sheets.calls.some(
        (c) => c.method === "POST" && decodeURIComponent(c.url).includes("/values/Circumference!A:ZZ:clear"),
      ),
    ).toBe(false);
  });

  test("the old DailyMetrics tab is never read or written", async () => {
    const oldRows = [
      ["id", "date", "metricType", "value", "unit", "recordedAt"],
      ["d-1", "2026-10-01", "weight", "60", "kg", "2026-10-01T08:00:00+09:00"],
    ];
    sheets.tabs.set("DailyMetrics", oldRows);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(sheets.tabs.get("DailyMetrics")).toEqual(oldRows);
    expect(sheets.calls.some((c) => decodeURIComponent(c.url).includes("DailyMetrics"))).toBe(false);
    expect(result.results.map((r) => r.tableName)).not.toContain("DailyMetrics");
  });

  test("the old Measurements tab is never read, written or deleted", async () => {
    const oldRows = [
      [...MEASUREMENT_FIXED, "weight"],
      [...measurementFixedCells(makeMeasurement()), "60"],
    ];
    sheets.tabs.set("Measurements", oldRows);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(sheets.tabs.get("Measurements")).toEqual(oldRows);
    expect(sheets.calls.some((c) => decodeURIComponent(c.url).includes("/Measurements"))).toBe(false);
    expect(sheets.calls.some((c) => decodeURIComponent(c.url).includes("values/Measurements"))).toBe(false);
    expect(result.results.map((r) => r.tableName)).not.toContain("Measurements");
    expect(sheetTabs()).not.toContain("Measurements");
    expect(await appDb.bodyRecords.count()).toBe(0);
    expect(await appDb.circumferenceRecords.count()).toBe(0);
  });

  test.each([
    ["BodyMeasurements", "bodyRecords"],
    ["Circumference", "circumferenceRecords"],
  ] as const)("a %s record deleted locally disappears from both local and the sheet", async (tab, table) => {
    const record = makeMeasurement({ values: {} });
    const headers = tab === "BodyMeasurements" ? BODY_HEADERS : CIRCUMFERENCE_HEADERS;
    await appDb.tombstones.put({
      id: `${tab}:m-1`,
      table: tab,
      recordId: "m-1",
      deletedAt: "2026-10-20T10:00:00+09:00",
    });
    sheets.tabs.set(tab, [headers, [...measurementFixedCells(record), ...blanks(headers.length - 5)]]);

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect(await appDb[table].toArray()).toEqual([]);
    expect(sheets.tabs.get(tab)).toEqual([headers]);
  });
});
