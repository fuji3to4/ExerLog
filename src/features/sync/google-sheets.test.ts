import { describe, expect, test, vi, beforeEach } from "vitest";
import {
  findSpreadsheet,
  createSpreadsheet,
  readSheetColumn,
  appendRows,
  ensureSheetTabs,
} from "./google-sheets";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;
const FAKE_TOKEN = "fake-token";

beforeEach(() => {
  mockFetch.mockReset();
});

describe("findSpreadsheet", () => {
  test("returns spreadsheet info when found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          files: [{ id: "sheet123", name: "ExerLog Data" }],
        }),
    });
    const result = await findSpreadsheet(FAKE_TOKEN);
    expect(result).toEqual({ spreadsheetId: "sheet123" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("ExerLog%20Data"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer fake-token" }) }),
    );
  });

  test("returns null when no spreadsheet found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    });
    const result = await findSpreadsheet(FAKE_TOKEN);
    expect(result).toBeNull();
  });

  test("returns null on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
    const result = await findSpreadsheet(FAKE_TOKEN);
    expect(result).toBeNull();
  });
});

describe("createSpreadsheet", () => {
  test("creates spreadsheet with all tabs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          spreadsheetId: "new123",
          spreadsheetUrl: "https://sheets.google.com/spreadsheets/d/new123",
        }),
    });
    const result = await createSpreadsheet(FAKE_TOKEN);
    expect(result).not.toBeNull();
    expect(result!.spreadsheetId).toBe("new123");
    // Check that the body includes all 6 sheet titles
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.sheets).toHaveLength(6);
    expect(callBody.sheets.map((s: any) => s.properties.title)).toEqual([
      "ExerciseLogs",
      "DailyWellness",
      "DailyMetrics",
      "DailySelfCare",
      "Exercises",
      "SelfCareCatalog",
    ]);
  });
});

describe("readSheetColumn", () => {
  test("returns values from the first column", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          values: [["id"], ["a"], ["b"], ["c"]],
        }),
    });
    const result = await readSheetColumn(FAKE_TOKEN, "sheet123", "ExerciseLogs");
    // Header row is excluded
    expect(result).toEqual(["a", "b", "c"]);
  });

  test("returns empty array when sheet is empty or missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const result = await readSheetColumn(FAKE_TOKEN, "sheet123", "EmptySheet");
    expect(result).toEqual([]);
  });

  test("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await readSheetColumn(FAKE_TOKEN, "sheet123", "Fail");
    expect(result).toEqual([]);
  });
});

describe("appendRows", () => {
  test("sends values to the sheets append endpoint", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    const headers = ["id", "date"];
    const rows = [
      ["1", "2026-01-01"],
      ["2", "2026-01-02"],
    ];
    await appendRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", headers, rows);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.values).toEqual([["1", "2026-01-01"], ["2", "2026-01-02"]]);
  });

  test("skips API call when rows are empty", async () => {
    mockFetch.mockReset();
    await appendRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", ["id"], []);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("ensureSheetTabs", () => {
  test("creates missing sheet tabs", async () => {
    // First call to get spreadsheet metadata returns only 2 existing sheets
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sheets: [
            { properties: { title: "ExerciseLogs" } },
            { properties: { title: "DailyWellness" } },
          ],
        }),
    });
    // Second call is batchUpdate to add missing tabs
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ replies: [{}] }),
    });
    const result = await ensureSheetTabs(FAKE_TOKEN, "sheet123");
    expect(result).toBe(true);
    const batchBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(batchBody.requests).toHaveLength(4); // 4 missing tabs
  });

  test("succeeds when all tabs exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sheets: [
            { properties: { title: "ExerciseLogs" } },
            { properties: { title: "DailyWellness" } },
            { properties: { title: "DailyMetrics" } },
            { properties: { title: "DailySelfCare" } },
            { properties: { title: "Exercises" } },
            { properties: { title: "SelfCareCatalog" } },
          ],
        }),
    });
    const result = await ensureSheetTabs(FAKE_TOKEN, "sheet123");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No batchUpdate call
  });
});