import { describe, expect, test, vi, beforeEach } from "vitest";
import { syncTable, syncAll } from "./sync-engine";

// Mock the sheets module
vi.mock("./google-sheets", () => ({
  readSheetColumn: vi.fn(),
  appendRowsBatched: vi.fn(),
  findSpreadsheet: vi.fn(),
  createSpreadsheet: vi.fn(),
  ensureSheetTabs: vi.fn(),
  writeHeaders: vi.fn(),
  SHEET_TABS: ["TableOne", "TableTwo"],
}));

// Mock sync-config with a small, deterministic config set for syncAll tests.
// Hoisted to top so it applies to all tests in this file.
vi.mock("./sync-config", async () => {
  const actual = await vi.importActual<typeof import("./sync-config")>(
    "./sync-config",
  );
  return {
    ...actual,
    TABLE_SYNC_CONFIGS: [
      {
        keyColumn: "id",
        headers: ["id", "name"],
        readFromDb: async () => [{ id: "a", name: "A" }],
        toRow: (r: { id: string; name: string }) => [r.id, r.name],
      },
      {
        keyColumn: "id",
        headers: ["id", "value"],
        readFromDb: async () => [{ id: "b", value: 1 }],
        toRow: (r: { id: string; value: number }) => [r.id, String(r.value)],
      },
    ],
  };
});

import {
  readSheetColumn,
  appendRowsBatched,
  findSpreadsheet,
  createSpreadsheet,
  ensureSheetTabs,
  writeHeaders,
} from "./google-sheets";

const FAKE_TOKEN = "fake-token";
const FAKE_SPREADSHEET_ID = "sheet123";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncTable", () => {
  const config = {
    keyColumn: "id",
    headers: ["id", "name"],
    readFromDb: async () => [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
    ],
    toRow: (r: any) => [r.id, r.name],
  };

  test("appends only new rows not present in sheet", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue(["1", "3"]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.appended).toBe(1);
    expect(result.total).toBe(3);
    expect(result.found).toBe(2);
    expect(appendRowsBatched).toHaveBeenCalledWith(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config.headers,
      [["2", "Bob"]],
    );
  });

  test("appends all rows when sheet is empty", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.appended).toBe(3);
  });

  test("appends nothing when all rows exist", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue(["1", "2", "3"]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.appended).toBe(0);
    expect(appendRowsBatched).not.toHaveBeenCalled();
  });

  test("reports error when append fails", async () => {
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(false);

    const result = await syncTable(
      FAKE_TOKEN,
      FAKE_SPREADSHEET_ID,
      "ExerciseLogs",
      config,
      vi.fn(),
    );

    expect(result.error).toBeDefined();
    expect(result.appended).toBe(0);
  });
});

describe("syncAll", () => {
  test("finds existing spreadsheet, ensures tabs, syncs each table", async () => {
    vi.mocked(findSpreadsheet).mockResolvedValue({
      spreadsheetId: FAKE_SPREADSHEET_ID,
    });
    vi.mocked(ensureSheetTabs).mockResolvedValue(true);
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncAll(FAKE_TOKEN);

    expect(findSpreadsheet).toHaveBeenCalledWith(FAKE_TOKEN);
    expect(createSpreadsheet).not.toHaveBeenCalled();
    expect(ensureSheetTabs).toHaveBeenCalledWith(FAKE_TOKEN, FAKE_SPREADSHEET_ID);
    expect(writeHeaders).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.spreadsheetId).toBe(FAKE_SPREADSHEET_ID);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.appended === 1)).toBe(true);
  });

  test("creates new spreadsheet and writes headers when none exists", async () => {
    vi.mocked(findSpreadsheet).mockResolvedValue(null);
    vi.mocked(createSpreadsheet).mockResolvedValue({
      spreadsheetId: FAKE_SPREADSHEET_ID,
    });
    vi.mocked(writeHeaders).mockResolvedValue(true);
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    const result = await syncAll(FAKE_TOKEN);

    expect(createSpreadsheet).toHaveBeenCalledWith(FAKE_TOKEN);
    expect(ensureSheetTabs).not.toHaveBeenCalled();
    // 2 configs × 1 writeHeaders call each
    expect(writeHeaders).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result.spreadsheetId).toBe(FAKE_SPREADSHEET_ID);
  });

  test("returns failure when createSpreadsheet returns null", async () => {
    vi.mocked(findSpreadsheet).mockResolvedValue(null);
    vi.mocked(createSpreadsheet).mockResolvedValue(null);

    const result = await syncAll(FAKE_TOKEN);

    expect(result.success).toBe(false);
    expect(result.results[0].error).toBe("Failed to create spreadsheet");
  });

  test("propagates per-table errors and reports partial failure", async () => {
    vi.mocked(findSpreadsheet).mockResolvedValue({
      spreadsheetId: FAKE_SPREADSHEET_ID,
    });
    vi.mocked(ensureSheetTabs).mockResolvedValue(true);
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    // First call succeeds, second fails
    vi.mocked(appendRowsBatched)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await syncAll(FAKE_TOKEN);

    expect(result.success).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].error).toBeUndefined();
    expect(result.results[1].error).toBeDefined();
  });

  test("queues concurrent calls to syncAll sequentially", async () => {
    let activeRuns = 0;
    let maxConcurrentRuns = 0;

    vi.mocked(findSpreadsheet).mockImplementation(async () => {
      activeRuns++;
      maxConcurrentRuns = Math.max(maxConcurrentRuns, activeRuns);
      // Introduce a small delay to allow overlap if concurrent execution were possible
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeRuns--;
      return { spreadsheetId: FAKE_SPREADSHEET_ID };
    });

    vi.mocked(ensureSheetTabs).mockResolvedValue(true);
    vi.mocked(readSheetColumn).mockResolvedValue([]);
    vi.mocked(appendRowsBatched).mockResolvedValue(true);

    // Call syncAll twice concurrently
    const [res1, res2] = await Promise.all([
      syncAll(FAKE_TOKEN),
      syncAll(FAKE_TOKEN),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    // Since calls are serialized, activeRuns should never exceed 1
    expect(maxConcurrentRuns).toBe(1);
  });
});