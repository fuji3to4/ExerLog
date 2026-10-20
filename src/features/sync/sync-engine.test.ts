import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ExerciseLog, Tombstone } from "@/lib/types";
import { appDb } from "@/features/storage/app-db";
import { SHEET_TABS } from "./google-sheets";
import { TABLE_SYNC_CONFIGS } from "./sync-config";
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
  calls: { method: string; url: string }[] = [];

  constructor() {
    for (const tab of SHEET_TABS) this.tabs.set(tab, []);
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
        this.tabs.set(tab, JSON.parse(init!.body!).values);
        return json({});
      }
    }

    if (url.includes(`/spreadsheets/${SPREADSHEET_ID}?fields=`)) {
      return json({ sheets: [...this.tabs.keys()].map((title) => ({ properties: { title } })) });
    }

    if (url === "https://sheets.googleapis.com/v4/spreadsheets" && method === "POST") {
      this.spreadsheetExists = true;
      for (const sheet of JSON.parse(init!.body!).sheets) this.tabs.set(sheet.properties.title, []);
      return json({ spreadsheetId: SPREADSHEET_ID });
    }

    throw new Error(`Unexpected fetch ${method} ${url}`);
  };
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

let sheets: FakeSheets;

beforeEach(async () => {
  await Promise.all(appDb.tables.map((table) => table.clear()));
  sheets = new FakeSheets();
  vi.stubGlobal("fetch", vi.fn(sheets.handle));
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  test("syncs every tab, Tombstones first, and reports row counts", async () => {
    await appDb.exerciseLogs.put(makeLog());
    const progress: string[] = [];

    const result = await syncAll(TOKEN, (r) => progress.push(r.tableName));

    expect(result.success).toBe(true);
    expect(result.spreadsheetId).toBe(SPREADSHEET_ID);
    expect(progress[0]).toBe("Tombstones");
    expect([...progress].sort()).toEqual([...SHEET_TABS].sort());
    expect(result.results.find((r) => r.tableName === "ExerciseLogs")).toEqual({
      tableName: "ExerciseLogs",
      rowCount: 1,
    });
    for (const config of TABLE_SYNC_CONFIGS) {
      expect(sheets.tabs.get(config.tabName)?.[0]).toEqual(config.headers);
    }
  });

  test("creates the spreadsheet with every tab when none exists", async () => {
    sheets.spreadsheetExists = false;
    sheets.tabs.clear();

    const result = await syncAll(TOKEN);

    expect(result.success).toBe(true);
    expect([...sheets.tabs.keys()].sort()).toEqual([...SHEET_TABS].sort());
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
