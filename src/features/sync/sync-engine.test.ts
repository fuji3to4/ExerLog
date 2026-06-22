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
}));

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
    // eslint-disable-next-line @typescript-eslint/require-await
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