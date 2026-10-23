import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { addMeasurement } from "@/features/storage/measurements.repository";
import { localIsoAt } from "@/lib/date/local-iso";
import type { MeasurementRecord } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { RECORD_KIND_STORAGE_KEY, RecordDialog, type RecordDialogProps } from "./record-dialog";

const DATE = "2026-10-20";

function renderDialog(props: Partial<RecordDialogProps> = {}) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  const utils = renderWithLanguage(
    <RecordDialog open onOpenChange={onOpenChange} date={DATE} onSaved={onSaved} {...props} />,
    { initialLanguage: "ja" },
  );
  return { ...utils, onSaved, onOpenChange };
}

function input(label: string) {
  return within(screen.getByRole("dialog")).getByLabelText(label) as HTMLInputElement;
}

function saveButton() {
  return within(screen.getByRole("dialog")).getByRole("button", { name: "保存" }) as HTMLButtonElement;
}

async function onlyRecord(): Promise<MeasurementRecord> {
  const all = await appDb.measurements.toArray();
  expect(all).toHaveLength(1);
  return all[0];
}

describe("RecordDialog", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 7, 12, 0));
    window.localStorage.clear();
    await Promise.all([appDb.measurements.clear(), appDb.wellnessEntries.clear(), appDb.tombstones.clear()]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens on 体調 by default and offers the 体の数値 switch", async () => {
    renderDialog();

    const tabs = within(await screen.findByRole("tablist")).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["体調", "体の数値"]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(within(screen.getByRole("dialog")).getByRole("group", { name: "からだ" })).toBeTruthy();
  });

  it("saves only the entered measurement values", async () => {
    const { onSaved } = renderDialog();

    fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
    fireEvent.change(input("体重"), { target: { value: "60.2" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const record = await onlyRecord();
    expect(record.values).toEqual({ weight: 60.2 });
    expect(record.date).toBe(DATE);
    expect(record.recordedAt.slice(11, 16)).toBe("07:12");
    expect(onSaved).toHaveBeenCalledWith(record.id);
  });

  it("shows previous values as placeholders and computes BMI from the previous height", async () => {
    await addMeasurement({
      date: "2026-10-19",
      recordedAt: localIsoAt("2026-10-19", new Date(2026, 9, 19, 8, 0, 0)),
      values: { height: 170, bodyFat: 22.4 },
      note: "",
    });
    const { onSaved } = renderDialog();

    fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
    await waitFor(() => expect(input("体脂肪率").placeholder).toBe("前回 22.4"));
    expect(input("身長").placeholder).toBe("前回 170.0");
    expect(input("体重").placeholder).toBe("");

    fireEvent.change(input("体重"), { target: { value: "60" } });
    expect(await screen.findByText("BMI 20.8")).toBeTruthy();

    fireEvent.click(saveButton());
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const saved = (await appDb.measurements.toArray()).find((record) => record.date === DATE);
    expect(saved?.values).toEqual({ weight: 60 });
  });

  it("asks for a height when there is none and uses an entered height", async () => {
    renderDialog();

    fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
    expect(screen.queryByText(/BMI/)).toBeNull();
    fireEvent.change(input("体重"), { target: { value: "60" } });
    expect(await screen.findByText("身長を記録するとBMIが出ます")).toBeTruthy();
    fireEvent.change(input("身長"), { target: { value: "160" } });
    expect(await screen.findByText("BMI 23.4")).toBeTruthy();
  });

  it("updates the placeholders when the time changes", async () => {
    await addMeasurement({
      date: DATE,
      recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 6, 0, 0)),
      values: { weight: 59.5 },
      note: "",
    });
    renderDialog();

    fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
    await waitFor(() => expect(input("体重").placeholder).toBe("前回 59.5"));
    fireEvent.change(input("時刻"), { target: { value: "05:30" } });
    await waitFor(() => expect(input("体重").placeholder).toBe(""));
  });

  it("disables save while every field is empty or a value is out of range", async () => {
    renderDialog();

    fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(input("体重"), { target: { value: "600" } });
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(input("体重"), { target: { value: "60.25" } });
    expect(saveButton().disabled).toBe(true);
    fireEvent.change(input("体重"), { target: { value: "60.2" } });
    expect(saveButton().disabled).toBe(false);
    expect(input("体重").step).toBe("0.1");
  });

  it("remembers the last used kind", async () => {
    const first = renderDialog();
    fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
    expect(window.localStorage.getItem(RECORD_KIND_STORAGE_KEY)).toBe("measurement");
    first.unmount();

    renderDialog();
    expect((await screen.findByRole("tab", { name: "体の数値" })).getAttribute("aria-selected")).toBe("true");
    expect(input("体重")).toBeTruthy();
  });

  it("falls back to 体調 when storage cannot be read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderDialog();
    expect((await screen.findByRole("tab", { name: "体調" })).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps values that are not edited and has no switch when editing", async () => {
    const record = await addMeasurement({
      date: DATE,
      recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 7, 0, 0)),
      values: { weight: 61, waist: 80 },
      note: "朝",
    });
    const { onSaved } = renderDialog({ editing: { kind: "measurement", record } });

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.queryByRole("tablist", { name: "記録の種類" })).toBeNull();
    expect(input("体重").value).toBe("61");
    fireEvent.change(input("体重"), { target: { value: "62" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(record.id), { timeout: 3000 });
    const saved = await onlyRecord();
    expect(saved.values).toEqual({ weight: 62, waist: 80 });
    expect(saved.note).toBe("朝");
  });

  it("removes a listed item whose field is cleared while editing", async () => {
    const record = await addMeasurement({
      date: DATE,
      recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 7, 0, 0)),
      values: { weight: 61, bodyFat: 22 },
      note: "",
    });
    const { onSaved } = renderDialog({ editing: { kind: "measurement", record } });

    fireEvent.change(await waitFor(() => input("体脂肪率")), { target: { value: "" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect((await onlyRecord()).values).toEqual({ weight: 61 });
  });

  it("saves a stored value that fails validation when only the note is edited", async () => {
    const record = await addMeasurement({
      date: DATE,
      recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 7, 0, 0)),
      values: { weight: 60.25 },
      note: "",
    });
    const { onSaved } = renderDialog({ editing: { kind: "measurement", record } });

    fireEvent.change(await waitFor(() => input("メモ")), { target: { value: "読み込み" } });
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
    const saved = await onlyRecord();
    expect(saved.values).toEqual({ weight: 60.25 });
    expect(saved.note).toBe("読み込み");
  });

  it("validates a stored value again once the field is edited", async () => {
    const record = await addMeasurement({ date: DATE, values: { weight: 60.25 }, note: "" });
    renderDialog({ editing: { kind: "measurement", record } });

    fireEvent.change(await waitFor(() => input("体重")), { target: { value: "60.35" } });
    expect(saveButton().disabled).toBe(true);
  });

  it("does not show the edited record's own values as previous values", async () => {
    const record = await addMeasurement({
      date: DATE,
      recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 7, 0, 0)),
      values: { weight: 61, height: 170 },
      note: "",
    });
    renderDialog({ editing: { kind: "measurement", record } });

    fireEvent.change(await waitFor(() => input("時刻")), { target: { value: "09:00" } });
    fireEvent.change(input("身長"), { target: { value: "" } });
    // Give the lookup for the new time a chance to settle.
    await waitFor(() => expect(screen.getByText("身長を記録するとBMIが出ます")).toBeTruthy());
    expect(input("体重").placeholder).toBe("");
    expect(input("身長").placeholder).toBe("");
  });

  it("deletes a measurement record with a tombstone", async () => {
    const record = await addMeasurement({ date: DATE, values: { weight: 61 }, note: "" });
    const onDeleted = vi.fn();
    renderDialog({ editing: { kind: "measurement", record }, onDeleted });

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(await appDb.measurements.count()).toBe(0);
    expect((await appDb.tombstones.toArray()).map((t) => t.table)).toEqual(["Measurements"]);
  });

  it("shows only the wellness form when editing a wellness entry", async () => {
    const entry = {
      id: "w1",
      date: DATE,
      recordedAt: localIsoAt(DATE),
      physicalScore: 2 as const,
      mentalScore: 4 as const,
      note: "",
      updatedAt: localIsoAt(DATE),
    };
    renderDialog({ editing: { kind: "wellness", entry } });

    const dialog = await screen.findByRole("dialog");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(within(dialog).getByRole("heading", { name: "体調の記録を編集" })).toBeTruthy();
    expect(within(dialog).queryByLabelText("体重")).toBeNull();
  });

  describe("circumference", () => {
    it("opens on the remembered limb and shows left/right fields for its five sites only", async () => {
      window.localStorage.setItem("exerlog-circumference-limb", "leg");
      renderDialog();
      fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
      expect(screen.getByRole("tab", { name: "脚" }).getAttribute("aria-selected")).toBe("true");
      expect(input("足首 左")).toBeTruthy();
      expect(within(screen.getByRole("dialog")).queryByLabelText("手首 左")).toBeNull();
    });

    it("keeps arm values when switching to leg and saves both in one record", async () => {
      const { onSaved } = renderDialog();
      fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
      fireEvent.change(input("肘下5cm 右"), { target: { value: "24.5" } });
      fireEvent.click(screen.getByRole("tab", { name: "脚" }));
      fireEvent.change(input("足首 左"), { target: { value: "21.0" } });
      fireEvent.click(screen.getByRole("tab", { name: "腕" }));
      expect(input("肘下5cm 右").value).toBe("24.5");
      fireEvent.click(saveButton());
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1), { timeout: 3000 });
      expect((await onlyRecord()).values).toEqual({ armBelowElbowRight: 24.5, legAnkleLeft: 21 });
      expect(window.localStorage.getItem("exerlog-circumference-limb")).toBe("arm");
    });

    it("blocks saving and marks the hidden limb when it holds an invalid value", async () => {
      renderDialog();
      fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
      fireEvent.change(input("手首 左"), { target: { value: "200" } });
      fireEvent.click(screen.getByRole("tab", { name: "脚" }));
      fireEvent.change(input("足首 左"), { target: { value: "21.0" } });
      expect(saveButton().disabled).toBe(true);
      expect(screen.getByRole("tab", { name: /腕/ }).textContent).toContain("⚠");
    });

    it("shows the previous value of each side as a placeholder", async () => {
      await addMeasurement({
        date: "2026-10-19",
        recordedAt: localIsoAt("2026-10-19", new Date(2026, 9, 19, 21, 0, 0)),
        values: { armBelowElbowRight: 24.5 },
        note: "",
      });
      renderDialog();
      fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));
      await waitFor(() => expect(input("肘下5cm 右").placeholder).toBe("前回 24.5"));
      expect(input("肘下5cm 左").placeholder).toBe("");
    });

    it("opens an edited leg-only record on 脚 even when 腕 was remembered", async () => {
      const record = await addMeasurement({
        date: DATE,
        recordedAt: localIsoAt(DATE, new Date(2026, 9, 20, 6, 0, 0)),
        values: { legAnkleLeft: 21 },
        note: "",
      });
      window.localStorage.setItem("exerlog-circumference-limb", "arm");
      renderDialog({ editing: { kind: "measurement", record } });
      expect((await screen.findByRole("tab", { name: "脚" })).getAttribute("aria-selected")).toBe("true");
      expect(input("足首 左").value).toBe("21");
    });
  });
});
