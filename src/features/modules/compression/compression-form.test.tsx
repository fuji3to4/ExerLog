import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt } from "@/lib/date/local-iso";
import { renderWithLanguage } from "@/test/render-with-language";
import { CompressionForm } from "./compression-form";

const DATE = "2026-10-20";

function renderForm() {
  const onSaved = vi.fn();
  renderWithLanguage(<CompressionForm onOpenChange={vi.fn()} date={DATE} onSaved={onSaved} />, {
    initialLanguage: "ja",
  });
  return { onSaved };
}

/** A garment put on at the given local time today (default 08:10) and not yet taken off. */
async function addOpenGarment(hour = 8, minute = 10, note = "") {
  const recordedAt = localIsoAt(toDayKey(new Date()), new Date(2026, 0, 1, hour, minute));
  await appDb.compressionRecords.add({
    id: "open",
    date: recordedAt.slice(0, 10),
    recordedAt,
    kind: "garment",
    endedAt: null,
    note,
    updatedAt: recordedAt,
  });
}

beforeEach(async () => {
  await appDb.compressionRecords.clear();
});

describe("CompressionForm", () => {
  it("puts on a garment with an empty take-off time", async () => {
    const { onSaved } = renderForm();
    expect(screen.getByRole("radio", { name: "弾性着衣" }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByLabelText("外した時刻") as HTMLInputElement).value).toBe("");
    await waitFor(() => expect((screen.getByRole("button", { name: "保存" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    const records = await appDb.compressionRecords.toArray();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ kind: "garment", endedAt: null });
  });

  it("takes off the open record instead of adding one", async () => {
    await addOpenGarment();
    const { onSaved } = renderForm();
    await screen.findByText("弾性着衣 8:10〜 着用中");
    // The default take-off time is now, which can precede 08:10 early in the day.
    fireEvent.change(screen.getByLabelText("外した時刻"), { target: { value: `${toDayKey(new Date())}T23:59` } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    const records = await appDb.compressionRecords.toArray();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("open");
    expect(records[0].endedAt).not.toBeNull();
  });

  it("shows the open record's note in take-off mode and clears it for a new record", async () => {
    await addOpenGarment(8, 10, "きつめ");
    const { onSaved } = renderForm();
    await screen.findByText("弾性着衣 8:10〜 着用中");
    expect((screen.getByLabelText("メモ") as HTMLTextAreaElement).value).toBe("きつめ");
    fireEvent.change(screen.getByLabelText("外した時刻"), { target: { value: `${toDayKey(new Date())}T23:59` } });
    fireEvent.change(screen.getByLabelText("メモ"), { target: { value: "きつめ、夕方に外した" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect(await appDb.compressionRecords.toArray()).toMatchObject([{ id: "open", note: "きつめ、夕方に外した" }]);
  });

  it("clears the prefilled note when starting a new record", async () => {
    await addOpenGarment(8, 10, "きつめ");
    renderForm();
    await screen.findByText("弾性着衣 8:10〜 着用中");
    fireEvent.click(screen.getByRole("button", { name: "新しく着けた記録にする" }));
    expect((screen.getByLabelText("メモ") as HTMLTextAreaElement).value).toBe("");
  });

  it("switches to a new put-on for another kind or on request", async () => {
    await addOpenGarment();
    renderForm();
    await screen.findByText("弾性着衣 8:10〜 着用中");
    fireEvent.click(screen.getByRole("radio", { name: "弾性包帯" }));
    await waitFor(() => expect(screen.queryByText("弾性着衣 8:10〜 着用中")).toBeNull());
    expect(screen.getByLabelText("着けた時刻")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "弾性着衣" }));
    await screen.findByText("弾性着衣 8:10〜 着用中");
    fireEvent.click(screen.getByRole("button", { name: "新しく着けた記録にする" }));
    expect(screen.queryByText("弾性着衣 8:10〜 着用中")).toBeNull();
    expect(screen.getByLabelText("着けた時刻")).toBeTruthy();
  });

  it("refuses a take-off before the put-on", async () => {
    renderForm();
    const save = () => screen.getByRole("button", { name: "保存" }) as HTMLButtonElement;
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.change(screen.getByLabelText("着けた時刻"), { target: { value: "2026-10-20T10:00" } });
    fireEvent.change(screen.getByLabelText("外した時刻"), { target: { value: "2026-10-20T09:00" } });
    expect(screen.getByText("外した時刻は着けた時刻より後にしてください")).toBeTruthy();
    expect(save().disabled).toBe(true);
  });

  it("refuses a take-off before the put-on of the open record", async () => {
    await addOpenGarment();
    renderForm();
    await screen.findByText("弾性着衣 8:10〜 着用中");
    const save = () => screen.getByRole("button", { name: "保存" }) as HTMLButtonElement;
    await waitFor(() => expect(save().disabled).toBe(false));
    fireEvent.change(screen.getByLabelText("外した時刻"), { target: { value: `${toDayKey(new Date())}T07:00` } });
    expect(screen.getByText("外した時刻は着けた時刻より後にしてください")).toBeTruthy();
    expect(save().disabled).toBe(true);
  });

  it("keeps saving off when the open-record lookup fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const where = vi.spyOn(appDb.compressionRecords, "where").mockImplementation(() => {
      throw new Error("lookup failed");
    });
    renderForm();
    await screen.findByRole("alert");
    expect((screen.getByRole("button", { name: "保存" }) as HTMLButtonElement).disabled).toBe(true);
    expect(error).toHaveBeenCalled();
    where.mockRestore();
    error.mockRestore();
    expect(await appDb.compressionRecords.count()).toBe(0);
  });

  it("files a night-crossing wear under the day it was put on", async () => {
    const { onSaved } = renderForm();
    fireEvent.change(screen.getByLabelText("着けた時刻"), { target: { value: "2026-10-28T22:00" } });
    fireEvent.change(screen.getByLabelText("外した時刻"), { target: { value: "2026-10-29T07:00" } });
    await waitFor(() => expect((screen.getByRole("button", { name: "保存" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect(await appDb.compressionRecords.toArray()).toMatchObject([{ date: "2026-10-28" }]);
  });

  it("edits a record and can clear the take-off time", async () => {
    const record = {
      id: "r",
      date: "2026-10-20",
      recordedAt: "2026-10-20T08:00:00+09:00",
      kind: "bandage" as const,
      endedAt: "2026-10-20T20:00:00+09:00",
      note: "",
      updatedAt: "2026-10-20T08:00:00+09:00",
    };
    await appDb.compressionRecords.add(record);
    const onSaved = vi.fn();
    renderWithLanguage(<CompressionForm onOpenChange={vi.fn()} date={DATE} record={record} onSaved={onSaved} />, {
      initialLanguage: "ja",
    });
    fireEvent.change(screen.getByLabelText("外した時刻"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 3000 });
    expect(await appDb.compressionRecords.toArray()).toMatchObject([{ id: "r", kind: "bandage", endedAt: null }]);
  });
});
