import { afterEach, describe, expect, test, vi, beforeEach } from "vitest";
import {
  findSpreadsheet,
  createSpreadsheet,
  ensureSheetTabs,
  readAllRows,
  replaceAllRows,
} from "./google-sheets";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;
const FAKE_TOKEN = "fake-token";

beforeEach(() => {
  mockFetch.mockReset();
  // Failure-path tests log expected errors; keep the output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
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
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.sheets.map((s: any) => s.properties.title)).toEqual([
      "ExerciseLogs",
      "WellnessEntries",
      "WatchEvents",
      "DailyMetrics",
      "DailySelfCare",
      "Exercises",
      "SelfCareCatalog",
      "Tombstones",
    ]);
  });
});

describe("readAllRows", () => {
  test("returns all rows including header when sheet has data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          values: [
            ["id", "date", "exerciseId"],
            ["1", "2026-01-01", "ex-1"],
            ["2", "2026-01-02", "ex-2"],
          ],
        }),
    });
    const result = await readAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs");
    expect(result).toEqual([
      ["id", "date", "exerciseId"],
      ["1", "2026-01-01", "ex-1"],
      ["2", "2026-01-02", "ex-2"],
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("ExerciseLogs!A%3AZZ"),
      expect.any(Object),
    );
  });

  test("returns empty array when sheet is empty", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const result = await readAllRows(FAKE_TOKEN, "sheet123", "EmptySheet");
    expect(result).toEqual([]);
  });

  test("throws on API error so a failed read is never mistaken for an empty sheet", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(readAllRows(FAKE_TOKEN, "sheet123", "Fail")).rejects.toThrow();
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
    expect(batchBody.requests.map((r: any) => r.addSheet.properties.title)).toEqual([
      "WellnessEntries",
      "WatchEvents",
      "DailyMetrics",
      "DailySelfCare",
      "Exercises",
      "SelfCareCatalog",
      "Tombstones",
    ]);
  });

  test("succeeds when all tabs exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sheets: [
            { properties: { title: "ExerciseLogs" } },
            { properties: { title: "WellnessEntries" } },
            { properties: { title: "WatchEvents" } },
            { properties: { title: "DailyMetrics" } },
            { properties: { title: "DailySelfCare" } },
            { properties: { title: "Exercises" } },
            { properties: { title: "SelfCareCatalog" } },
            { properties: { title: "Tombstones" } },
          ],
        }),
    });
    const result = await ensureSheetTabs(FAKE_TOKEN, "sheet123");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No batchUpdate call
  });
});
describe("replaceAllRows", () => {
  test("clears the tab, then writes every row (header included) as RAW", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const rows = [
      ["id", "date"],
      ["1", "2026-10-20"],
    ];

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", rows);

    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [clearUrl, clearInit] = mockFetch.mock.calls[0];
    expect(clearUrl).toBe(
      "https://sheets.googleapis.com/v4/spreadsheets/sheet123/values/ExerciseLogs!A%3AZZ:clear",
    );
    expect(clearInit.method).toBe("POST");
    const [putUrl, putInit] = mockFetch.mock.calls[1];
    expect(putUrl).toBe(
      "https://sheets.googleapis.com/v4/spreadsheets/sheet123/values/ExerciseLogs!A1?valueInputOption=RAW",
    );
    expect(putInit.method).toBe("PUT");
    expect(JSON.parse(putInit.body)).toEqual({ values: rows });
  });

  test("returns false and skips the write when clearing fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve("err") });

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", [["id"]]);

    expect(ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("returns false when the write fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve("err") });

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", [["id"]]);

    expect(ok).toBe(false);
  });
});
