import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));
vi.mock("@/features/sync/google-auth", () => ({ trySilentRefresh: vi.fn() }));
vi.mock("./drive", () => ({ downloadPhoto: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { trySilentRefresh } from "@/features/sync/google-auth";
import { downloadPhoto } from "./drive";
import { getPhotoBlob } from "./repository";
import { usePhotoUrl } from "./use-photo-url";

const refresh = vi.mocked(trySilentRefresh);
const download = vi.mocked(downloadPhoto);
const createUrl = vi.fn((blob: Blob) => `blob:${blob.size}`);
const revokeUrl = vi.fn();

async function seedRecord(blob: Blob | null) {
  await appDb.photoRecords.put({
    id: "r1",
    date: "2026-10-20",
    recordedAt: "2026-10-20T08:00:00+09:00",
    note: "",
    photoIds: ["p1"],
    updatedAt: "2026-10-20T08:00:00+09:00",
  });
  await appDb.photoBlobs.put({ id: "p1", recordId: "r1", blob, width: 1, height: 1 });
}

async function seedFile() {
  await appDb.photoFiles.put({ id: "p1", recordId: "r1", driveFileId: "d1" } as never);
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }));
  await Promise.all([appDb.photoRecords.clear(), appDb.photoBlobs.clear(), appDb.photoFiles.clear()]);
});

describe("usePhotoUrl", () => {
  it("ready from a local blob without calling Drive", async () => {
    await seedRecord(new Blob(["abc"]));
    const { result } = renderHook(() => usePhotoUrl("p1", "r1"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it("not-uploaded when the photo has no PhotoFiles row", async () => {
    await seedRecord(null);
    const { result } = renderHook(() => usePhotoUrl("p1", "r1"));
    await waitFor(() => expect(result.current.status).toBe("not-uploaded"));
    expect(download).not.toHaveBeenCalled();
  });

  it("signed-out when there is no token", async () => {
    await seedRecord(null);
    await seedFile();
    refresh.mockResolvedValue(null);
    const { result } = renderHook(() => usePhotoUrl("p1", "r1"));
    await waitFor(() => expect(result.current.status).toBe("signed-out"));
    expect(download).not.toHaveBeenCalled();
  });

  it("downloads, stores the blob, then ready; failed on a download error", async () => {
    await seedRecord(null);
    await seedFile();
    refresh.mockResolvedValue({ accessToken: "tok" } as never);
    download.mockResolvedValueOnce(new Blob(["xyz"]));
    const first = renderHook(() => usePhotoUrl("p1", "r1"));
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    expect(download).toHaveBeenCalledWith("tok", "d1");
    expect((await getPhotoBlob("p1"))?.blob).not.toBeNull();
    first.unmount();

    await appDb.photoBlobs.put({ id: "p1", recordId: "r1", blob: null, width: 1, height: 1 });
    download.mockRejectedValueOnce(new Error("boom"));
    const second = renderHook(() => usePhotoUrl("p1", "r1"));
    await waitFor(() => expect(second.result.current.status).toBe("failed"));
  });

  it("retries a failed photo on the next mount", async () => {
    await seedRecord(null);
    await seedFile();
    refresh.mockResolvedValue({ accessToken: "tok" } as never);
    download.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(new Blob(["xyz"]));
    const first = renderHook(() => usePhotoUrl("p1", "r1"));
    await waitFor(() => expect(first.result.current.status).toBe("failed"));
    first.unmount();
    const second = renderHook(() => usePhotoUrl("p1", "r1"));
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
  });

  it("revokes the object URL on unmount", async () => {
    await seedRecord(new Blob(["abc"]));
    const { result, unmount } = renderHook(() => usePhotoUrl("p1", "r1"));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const url = (result.current as { url: string }).url;
    unmount();
    expect(revokeUrl).toHaveBeenCalledWith(url);
  });
});
