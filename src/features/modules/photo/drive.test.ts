import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GOOGLE_NAMES } from "@/features/sync/google-names";
import {
  downloadPhoto,
  findOrCreatePhotoFolder,
  trashDriveFile,
  uploadPhoto,
} from "./drive";

const TOKEN = "fake-token";
const FOLDER_KEY = "photo-folder-id";
const mockFetch = vi.fn();

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
}
function fail(status: number) {
  return { ok: false, status, json: async () => ({}), text: async () => "err" };
}

function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  window.localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GOOGLE_NAMES", () => {
  it("names the spreadsheet and the photo folder without the app's working name", () => {
    expect(GOOGLE_NAMES).toEqual({ spreadsheet: "ExerLog Data", photoFolder: "ExerLog Photos" });
  });
});

describe("findOrCreatePhotoFolder", () => {
  it("finds the oldest folder named GOOGLE_NAMES.photoFolder and remembers its id", async () => {
    mockFetch.mockResolvedValueOnce(
      ok({
        files: [
          { id: "newer", createdTime: "2026-10-02T00:00:00.000Z" },
          { id: "oldest", createdTime: "2026-09-01T00:00:00.000Z" },
          { id: "middle", createdTime: "2026-09-15T00:00:00.000Z" },
        ],
      }),
    );

    expect(await findOrCreatePhotoFolder(TOKEN)).toBe("oldest");
    expect(window.localStorage.getItem(FOLDER_KEY)).toBe("oldest");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url.startsWith("https://www.googleapis.com/drive/v3/files?")).toBe(true);
    const q = new URL(url).searchParams.get("q");
    expect(q).toBe(
      "name='ExerLog Photos' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    );
    expect(q).not.toContain("appProperties");
    expect(init.headers.Authorization).toBe("Bearer fake-token");
    expect(init.method ?? "GET").toBe("GET");
  });

  it("creates a folder named 'ExerLog Photos' when none exists (no appProperties)", async () => {
    mockFetch.mockResolvedValueOnce(ok({ files: [] })).mockResolvedValueOnce(ok({ id: "created" }));

    expect(await findOrCreatePhotoFolder(TOKEN)).toBe("created");
    expect(window.localStorage.getItem(FOLDER_KEY)).toBe("created");

    const [url, init] = mockFetch.mock.calls[1];
    expect(url.startsWith("https://www.googleapis.com/drive/v3/files")).toBe(true);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ name: "ExerLog Photos", mimeType: "application/vnd.google-apps.folder" });
  });

  it("reuses the remembered id while the folder exists", async () => {
    window.localStorage.setItem(FOLDER_KEY, "known");
    mockFetch.mockResolvedValueOnce(ok({ id: "known", trashed: false }));

    expect(await findOrCreatePhotoFolder(TOKEN)).toBe("known");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toMatch(/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/known\?/);
  });

  it("searches again when the remembered folder is gone (404) or trashed", async () => {
    window.localStorage.setItem(FOLDER_KEY, "gone");
    mockFetch
      .mockResolvedValueOnce(fail(404))
      .mockResolvedValueOnce(ok({ files: [{ id: "found", createdTime: "2026-09-01T00:00:00Z" }] }));
    expect(await findOrCreatePhotoFolder(TOKEN)).toBe("found");
    expect(window.localStorage.getItem(FOLDER_KEY)).toBe("found");

    mockFetch.mockReset();
    mockFetch
      .mockResolvedValueOnce(ok({ id: "found", trashed: true }))
      .mockResolvedValueOnce(ok({ files: [] }))
      .mockResolvedValueOnce(ok({ id: "fresh" }));
    expect(await findOrCreatePhotoFolder(TOKEN)).toBe("fresh");
  });

  it("throws when the search fails", async () => {
    mockFetch.mockResolvedValueOnce(fail(500));
    await expect(findOrCreatePhotoFolder(TOKEN)).rejects.toThrow();
    expect(window.localStorage.getItem(FOLDER_KEY)).toBeNull();
  });
});

describe("uploadPhoto", () => {
  it("uploads multipart with name '<photoId>.jpg', mimeType image/jpeg, parents [folderId]", async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: "file-1" }));

    const fileId = await uploadPhoto(TOKEN, "folder-1", "photo-1", new Blob(["JPEGDATA"], { type: "image/jpeg" }));

    expect(fileId).toBe("file-1");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer fake-token");
    const contentType: string = init.headers["Content-Type"];
    const boundary = contentType.match(/^multipart\/related; boundary=(.+)$/)?.[1];
    expect(boundary).toBeTruthy();

    const text = await readText(init.body);
    const parts = text.split(`--${boundary}`);
    expect(parts[0]).toBe("");
    expect(parts.at(-1)).toBe("--\r\n");
    const [metaHead, metaBody] = parts[1].split("\r\n\r\n");
    expect(metaHead).toContain("Content-Type: application/json; charset=UTF-8");
    expect(JSON.parse(metaBody)).toEqual({ name: "photo-1.jpg", mimeType: "image/jpeg", parents: ["folder-1"] });
    expect(parts[2]).toBe("\r\nContent-Type: image/jpeg\r\n\r\nJPEGDATA\r\n");
  });

  it("throws on failure", async () => {
    mockFetch.mockResolvedValueOnce(fail(403));
    await expect(uploadPhoto(TOKEN, "f", "p", new Blob(["x"]))).rejects.toThrow(/403/);
  });
});

describe("downloadPhoto", () => {
  it("downloads with alt=media and returns the blob", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, blob: async () => blob });

    expect(await downloadPhoto(TOKEN, "file-9")).toBe(blob);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/drive/v3/files/file-9?alt=media");
    expect(init.headers.Authorization).toBe("Bearer fake-token");
  });

  it("throws on failure", async () => {
    mockFetch.mockResolvedValueOnce(fail(404));
    await expect(downloadPhoto(TOKEN, "file-9")).rejects.toThrow(/404/);
  });
});

describe("trashDriveFile", () => {
  it("trashes with PATCH {trashed:true}; 404 counts as ok; 500 is failed", async () => {
    mockFetch.mockResolvedValueOnce(ok({ id: "d1" }));
    expect(await trashDriveFile(TOKEN, "d1")).toBe("ok");
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/drive/v3/files/d1");
    expect(init.method).toBe("PATCH");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ trashed: true });

    mockFetch.mockResolvedValueOnce(fail(404));
    expect(await trashDriveFile(TOKEN, "d2")).toBe("ok");

    mockFetch.mockResolvedValueOnce(fail(500));
    expect(await trashDriveFile(TOKEN, "d3")).toBe("failed");

    mockFetch.mockRejectedValueOnce(new TypeError("offline"));
    expect(await trashDriveFile(TOKEN, "d4")).toBe("failed");
  });
});
