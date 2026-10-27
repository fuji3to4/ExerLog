import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));
vi.mock("./resize", () => ({ resizeImage: vi.fn(), fitWithin: vi.fn(), PHOTO_MAX_EDGE: 1600 }));

import { ModuleRecordDialog } from "@/features/modules/components/module-record-dialog";
import { getRecordModule } from "@/features/modules/registry";
import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";
import { addPhotoRecord } from "./repository";
import { resizeImage } from "./resize";

const DATE = "2026-10-20";
const resizeMock = vi.mocked(resizeImage);

function file(name: string) {
  return new File([name], name, { type: "image/jpeg" });
}

function renderPhoto(record?: Parameters<typeof ModuleRecordDialog>[0]["record"]) {
  const onSaved = vi.fn();
  renderWithLanguage(
    <ModuleRecordDialog
      module={getRecordModule("photo")!}
      open
      onOpenChange={vi.fn()}
      date={DATE}
      record={record}
      onSaved={onSaved}
    />,
    { initialLanguage: "ja" },
  );
  return { onSaved };
}

function chooseInput() {
  return document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
}

function choose(files: File[]) {
  fireEvent.change(chooseInput(), { target: { files } });
}

function saveButton() {
  return within(screen.getByRole("dialog")).getByRole("button", { name: "保存" }) as HTMLButtonElement;
}

beforeEach(async () => {
  resizeMock.mockReset();
  resizeMock.mockImplementation(async (blob) => ({ blob, width: 10, height: 10 }));
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:mock-${n++}`);
  URL.revokeObjectURL = vi.fn();
  await Promise.all([appDb.photoRecords.clear(), appDb.photoBlobs.clear(), appDb.photoFiles.clear()]);
});

afterEach(() => vi.restoreAllMocks());

describe("PhotoForm", () => {
  it("adds chosen files in order and saves a record with their blobs", async () => {
    const { onSaved } = renderPhoto();
    expect(screen.getByRole("button", { name: "📷 撮る" })).toBeTruthy();
    expect(document.querySelector('input[type="file"][capture="environment"]')).toBeTruthy();

    choose([file("a"), file("bb")]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "この写真を外す" })).toHaveLength(2));
    fireEvent.change(within(screen.getByRole("dialog")).getByLabelText("メモ"), { target: { value: "左腕" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [record] = await appDb.photoRecords.toArray();
    expect(record.note).toBe("左腕");
    expect(record.photoIds).toHaveLength(2);
    const blobs = await Promise.all(record.photoIds.map((id) => appDb.photoBlobs.get(id)));
    expect(blobs.every((row) => row?.recordId === record.id)).toBe(true);
    expect(resizeMock.mock.calls.map(([f]) => (f as File).name)).toEqual(["a", "bb"]);
  });

  it("drops only the unreadable file and shows 読み込めませんでした", async () => {
    resizeMock.mockImplementation(async (blob) => {
      if ((blob as File).name === "bad") throw new Error("unreadable");
      return { blob, width: 10, height: 10 };
    });
    renderPhoto();

    choose([file("a"), file("bad"), file("c")]);

    await waitFor(() => expect(screen.getByText("読み込めませんでした")).toBeTruthy());
    await waitFor(() => expect(screen.getAllByRole("button", { name: "この写真を外す" })).toHaveLength(2));
  });

  it("adds at most 20 photos and shows 写真は20枚までです", async () => {
    renderPhoto();

    choose(Array.from({ length: 22 }, (_, i) => file(`p${i}`)));

    await waitFor(() => expect(screen.getAllByRole("button", { name: "この写真を外す" })).toHaveLength(20));
    expect(screen.getByText("写真は20枚までです")).toBeTruthy();
    expect(resizeMock).toHaveBeenCalledTimes(20);
  });

  it("disables save with no photos and while a photo is processing", async () => {
    let release!: () => void;
    resizeMock.mockImplementation(
      (blob) => new Promise((resolve) => (release = () => resolve({ blob, width: 1, height: 1 }))),
    );
    renderPhoto();
    expect(saveButton().disabled).toBe(true);

    choose([file("a")]);
    await waitFor(() => expect(screen.getByText("処理中")).toBeTruthy());
    expect(saveButton().disabled).toBe(true);

    release();
    await waitFor(() => expect(saveButton().disabled).toBe(false));
  });

  it("editing: removing a photo and adding one saves keepPhotoIds and added", async () => {
    const record = await addPhotoRecord({
      date: DATE,
      note: "n",
      photos: [
        { blob: new Blob(["1"]), width: 1, height: 1 },
        { blob: new Blob(["2"]), width: 1, height: 1 },
      ],
    });
    const { onSaved } = renderPhoto(record);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "この写真を外す" })).toHaveLength(2));

    fireEvent.click(screen.getAllByRole("button", { name: "この写真を外す" })[0]);
    choose([file("new")]);
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const saved = (await appDb.photoRecords.get(record.id))!;
    expect(saved.photoIds).toHaveLength(2);
    expect(saved.photoIds[0]).toBe(record.photoIds[1]);
    expect(await appDb.photoBlobs.get(record.photoIds[0])).toBeUndefined();
  });
});
