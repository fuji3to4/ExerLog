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
    const result = await createSpreadsheet(FAKE_TOKEN, ["A", "B"]);
    expect(result).not.toBeNull();
    expect(result!.spreadsheetId).toBe("new123");
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.sheets.map((s: any) => s.properties.title)).toEqual(["A", "B"]);
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
  test("creates only the missing sheet tabs from the given list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sheets: [{ properties: { title: "A" } }] }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ replies: [{}] }),
    });
    const result = await ensureSheetTabs(FAKE_TOKEN, "sheet123", ["A", "B"]);
    expect(result).toBe(true);
    const batchBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(batchBody.requests.map((r: any) => r.addSheet.properties.title)).toEqual(["B"]);
  });

  test("succeeds when all tabs exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sheets: [{ properties: { title: "A" } }, { properties: { title: "B" } }],
        }),
    });
    const result = await ensureSheetTabs(FAKE_TOKEN, "sheet123", ["A", "B"]);
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // No batchUpdate call
  });
});
describe("replaceAllRows", () => {
  /** Spreadsheet metadata listing one tab with the given column count. */
  function metadata(columnCount: number, title = "ExerciseLogs") {
    return {
      ok: true,
      json: () =>
        Promise.resolve({
          sheets: [{ properties: { sheetId: 7, title, gridProperties: { columnCount } } }],
        }),
    };
  }

  test("checks the column count, clears the tab, then writes every row (header included) as RAW", async () => {
    mockFetch
      .mockResolvedValueOnce(metadata(26))
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const rows = [
      ["id", "date"],
      ["1", "2026-10-20"],
    ];

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", rows);

    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    const [metaUrl] = mockFetch.mock.calls[0];
    expect(decodeURIComponent(metaUrl)).toBe(
      "https://sheets.googleapis.com/v4/spreadsheets/sheet123?fields=sheets.properties(sheetId,title,gridProperties.columnCount)",
    );
    const [clearUrl, clearInit] = mockFetch.mock.calls[1];
    expect(clearUrl).toBe(
      "https://sheets.googleapis.com/v4/spreadsheets/sheet123/values/ExerciseLogs!A%3AZZ:clear",
    );
    expect(clearInit.method).toBe("POST");
    const [putUrl, putInit] = mockFetch.mock.calls[2];
    expect(putUrl).toBe(
      "https://sheets.googleapis.com/v4/spreadsheets/sheet123/values/ExerciseLogs!A1?valueInputOption=RAW",
    );
    expect(putInit.method).toBe("PUT");
    expect(JSON.parse(putInit.body)).toEqual({ values: rows });
  });

  test("appends the missing columns before clearing when the rows are wider than the tab", async () => {
    mockFetch
      .mockResolvedValueOnce(metadata(26, "Measurements"))
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    const rows = [Array.from({ length: 28 }, (_, i) => `c${i}`), ["1"]];

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "Measurements", rows);

    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    const [growUrl, growInit] = mockFetch.mock.calls[1];
    expect(growUrl).toBe("https://sheets.googleapis.com/v4/spreadsheets/sheet123:batchUpdate");
    expect(growInit.method).toBe("POST");
    expect(JSON.parse(growInit.body)).toEqual({
      requests: [{ appendDimension: { sheetId: 7, dimension: "COLUMNS", length: 2 } }],
    });
    expect(mockFetch.mock.calls[2][0]).toContain(":clear");
  });

  test("returns false and clears nothing when appending columns fails", async () => {
    mockFetch
      .mockResolvedValueOnce(metadata(26, "Measurements"))
      .mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve("err") });
    const rows = [Array.from({ length: 28 }, (_, i) => `c${i}`)];

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "Measurements", rows);

    expect(ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("returns false and clears nothing when the column check fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve("err") });

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", [["id"]]);

    expect(ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("returns false and skips the write when clearing fails", async () => {
    mockFetch
      .mockResolvedValueOnce(metadata(26))
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve("err") });

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", [["id"]]);

    expect(ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("returns false when the write fails", async () => {
    mockFetch
      .mockResolvedValueOnce(metadata(26))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve("err") });

    const ok = await replaceAllRows(FAKE_TOKEN, "sheet123", "ExerciseLogs", [["id"]]);

    expect(ok).toBe(false);
  });
});
