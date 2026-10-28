import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import { replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { addExerciseLog } from "@/features/storage/exercise-logs.repository";
import { bodyRepository } from "@/features/modules/body/data";
import { circumferenceRepository } from "@/features/modules/circumference/data";
import { listTombstones } from "@/features/storage/tombstones.repository";
import { listWatchEventsForDay, recordWatchEvent } from "@/features/storage/watch-events.repository";
import { MODULE_SETTINGS_STORAGE_KEY } from "@/features/modules/module-settings";
import { useModuleSettings } from "@/features/modules/use-module-settings";
import { localIsoAt } from "@/lib/date/local-iso";
import { renderWithLanguage } from "@/test/render-with-language";
import { useDayTimeline } from "../use-day-timeline";
import { TimelineSection } from "./timeline-section";

const DATE = "2026-10-20";

function Harness({ onChanged, date = DATE }: { onChanged?: () => void; date?: string }) {
  const { enabledModules } = useModuleSettings();
  const timeline = useDayTimeline(date, enabledModules);
  return <TimelineSection date={date} timeline={timeline} onChanged={onChanged} />;
}

function rows() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

function wellnessRow() {
  return screen.getByRole("button", { name: /からだ4/ });
}

/** Opens the "＋ 記録する" drop-down and picks a module; resolves to the module's dialog. */
async function chooseModule(label: string) {
  fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: label }));
  return screen.findByRole("dialog", { name: `${label}を記録` });
}

async function waitForDialogToClose() {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
}

describe("TimelineSection", () => {
  beforeEach(async () => {
    // Only Date is faked so that "now" is 20:00 on DATE; timers stay real.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 20, 0, 0));
    window.localStorage.removeItem(MODULE_SETTINGS_STORAGE_KEY);
    await Promise.all([
      appDb.exerciseLogs.clear(),
      appDb.wellnessEntries.clear(),
      appDb.bodyRecords.clear(),
      appDb.circumferenceRecords.clear(),
      appDb.watchEvents.clear(),
      appDb.tombstones.clear(),
      appDb.exercises.clear(),
    ]);
    await replaceAllExercises([
      {
        id: "shoulder-roll",
        title: "肩まわしストレッチ",
        description: "",
        videoUrl: "",
        thumbnailUrl: "",
        bodyArea: "shoulder",
        purpose: "stretch",
        durationSeconds: 300,
        intensity: "low",
      },
    ]);
    await addExerciseLog({
      date: DATE,
      exerciseId: "shoulder-roll",
      result: "did",
      durationSeconds: 330,
      performedAt: localIsoAt(DATE, new Date(2026, 9, 20, 12, 0, 0)),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("adds, edits and deletes a wellness entry on the timeline", async () => {
    const onChanged = vi.fn();
    renderWithLanguage(<Harness onChanged={onChanged} />, { initialLanguage: "ja" });

    expect(await screen.findByText(/肩まわしストレッチ できた/)).toBeTruthy();

    // Add
    const addDialog = await chooseModule("体調");
    expect((within(addDialog).getByLabelText("時刻") as HTMLInputElement).value).toBe("20:00");
    fireEvent.click(within(within(addDialog).getByRole("group", { name: "からだ" })).getByRole("button", { name: "4" }));
    fireEvent.click(within(addDialog).getByRole("button", { name: "保存" }));
    expect(await within(addDialog).findByRole("button", { name: "✓ 保存しました" })).toBeTruthy();
    await waitForDialogToClose();

    await waitFor(() => expect(wellnessRow().className).toContain("timeline-item--new"));
    expect(rows()).toHaveLength(2);
    expect(rows()[1].textContent).toContain("からだ4");
    expect(rows()[1].textContent).toContain("夜");
    expect(onChanged).toHaveBeenCalledTimes(1);

    // Edit the time to 07:05 -> moves to the top and gets the morning tag
    fireEvent.click(wellnessRow());
    const editDialog = await screen.findByRole("dialog");
    fireEvent.change(within(editDialog).getByLabelText("時刻"), { target: { value: "07:05" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: "保存" }));
    await waitForDialogToClose();

    await waitFor(() => expect(rows()[0].textContent).toContain("からだ4"));
    expect(rows()[0].textContent).toContain("07:05");
    expect(rows()[0].textContent).toContain("朝");
    expect(onChanged).toHaveBeenCalledTimes(2);

    // Delete (two-step inline confirm)
    fireEvent.click(wellnessRow());
    const deleteDialog = await screen.findByRole("dialog");
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "削除" }));
    expect(within(deleteDialog).getByText("この記録を削除しますか？")).toBeTruthy();
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "削除" }));
    await waitForDialogToClose();

    await waitFor(() => expect(screen.queryByRole("button", { name: /からだ4/ })).toBeNull());
    expect(rows()).toHaveLength(1);
    const tombstones = await listTombstones();
    expect(tombstones.map((t) => t.table)).toEqual(["WellnessEntries"]);
    expect(onChanged).toHaveBeenCalledTimes(3);
  });

  it("adds a measurement record from + Add record and edits it", async () => {
    const onChanged = vi.fn();
    renderWithLanguage(<Harness onChanged={onChanged} />, { initialLanguage: "ja" });
    expect(await screen.findByText(/肩まわしストレッチ できた/)).toBeTruthy();

    const dialog = await chooseModule("身体");
    fireEvent.change(within(dialog).getByLabelText("体重"), { target: { value: "60.2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitForDialogToClose();

    const row = await screen.findByRole("button", { name: /📏 体重 60.2kg/ });
    await waitFor(() => expect(row.className).toContain("timeline-item--new"));
    expect(rows()).toHaveLength(2);
    const [saved] = await bodyRepository.listForDay(DATE);
    expect(saved.values).toEqual({ weight: 60.2 });
    expect(onChanged).toHaveBeenCalledTimes(1);

    fireEvent.click(row);
    const editDialog = await screen.findByRole("dialog", { name: "身体の記録を編集" });
    fireEvent.change(within(editDialog).getByLabelText("体重"), { target: { value: "61" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: "保存" }));
    await waitForDialogToClose();

    expect(await screen.findByRole("button", { name: /📏 体重 61.0kg/ })).toBeTruthy();
    expect(onChanged).toHaveBeenCalledTimes(2);
  });

  it("hides a module turned off in the settings from the timeline and the add menu", async () => {
    await bodyRepository.add({ date: DATE, values: { weight: 60 }, note: "" });
    const { rerender } = renderWithLanguage(<Harness />, { initialLanguage: "ja" });
    expect(await screen.findByRole("button", { name: /📏 体重 60.0kg/ })).toBeTruthy();
    expect(rows()).toHaveLength(2);

    window.localStorage.setItem(
      MODULE_SETTINGS_STORAGE_KEY,
      JSON.stringify({ order: ["wellness", "body", "circumference"], disabled: ["body"] }),
    );
    rerender(<Harness />);

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByRole("button", { name: /📏 体重/ })).toBeNull();
    fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["体調", "周径", "写真", "セルフケア", "着用"]);
  });

  it("shows the note of a measurement row on a second line", async () => {
    await bodyRepository.add({ date: DATE, values: { weight: 60 }, note: "朝いちばん" });
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    const row = await screen.findByRole("button", { name: /📏 体重 60.0kg/ });
    expect(row.textContent).toContain("朝いちばん");
  });

  it("shows a dash when a measurement only has values for unlisted items", async () => {
    await bodyRepository.add({ date: DATE, values: { unknownItem: 1 }, note: "" });
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    expect(await screen.findByRole("button", { name: /📏 —/ })).toBeTruthy();
  });

  it("shows a body and a circumference record at the same time as separate rows", async () => {
    const at = localIsoAt(DATE, new Date(2026, 9, 20, 7, 0, 0));
    await bodyRepository.add({ date: DATE, recordedAt: at, values: { weight: 60 }, note: "" });
    await circumferenceRepository.add({
      date: DATE,
      recordedAt: at,
      values: { armWristLeft: 15, armWristRight: 15.5 },
      note: "",
    });
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    const bodyRow = await screen.findByRole("button", { name: /📏 体重 60.0kg/ });
    const circumferenceRow = screen.getByRole("button", { name: /📏 腕の周径 2か所/ });
    expect(bodyRow).not.toBe(circumferenceRow);
    expect(bodyRow.textContent).not.toContain("周径");
    expect(rows()).toHaveLength(3);

    fireEvent.click(circumferenceRow);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "周径の記録を編集" })).toBeTruthy();
    expect((within(dialog).getByLabelText("手首 左") as HTMLInputElement).value).toBe("15");
    expect(within(dialog).queryByLabelText("体重")).toBeNull();
  });

  it("edits the duration of an exercise log", async () => {
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    const row = await screen.findByRole("button", { name: /肩まわしストレッチ できた/ });
    expect(row.textContent).toContain("5:30");
    fireEvent.click(row);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("分"), { target: { value: "3" } });
    fireEvent.change(within(dialog).getByLabelText("秒"), { target: { value: "15" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitForDialogToClose();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /肩まわしストレッチ できた/ }).textContent).toContain("3:15"),
    );
  });

  it("disables save when the exercise duration is zero", async () => {
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    fireEvent.click(await screen.findByRole("button", { name: /肩まわしストレッチ できた/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("分"), { target: { value: "0" } });
    fireEvent.change(within(dialog).getByLabelText("秒"), { target: { value: "0" } });
    expect((within(dialog).getByRole("button", { name: "保存" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("edits the time of a watch event and deletes it", async () => {
    await recordWatchEvent({
      exerciseId: "shoulder-roll",
      date: DATE,
      watchedAt: localIsoAt(DATE, new Date(2026, 9, 20, 18, 3, 0)),
    });
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    fireEvent.click(await screen.findByRole("button", { name: "▶ 肩まわしストレッチを視聴" }));
    const editDialog = await screen.findByRole("dialog");
    fireEvent.change(within(editDialog).getByLabelText("時刻"), { target: { value: "09:30" } });
    fireEvent.click(within(editDialog).getByRole("button", { name: "保存" }));
    await waitForDialogToClose();

    await waitFor(() => expect(rows()[0].textContent).toContain("09:30"));
    expect(rows()[0].textContent).toContain("▶ 肩まわしストレッチを視聴");
    const [saved] = await listWatchEventsForDay(DATE);
    expect(saved.watchedAt.slice(11, 19)).toBe("09:30:00");

    fireEvent.click(screen.getByRole("button", { name: "▶ 肩まわしストレッチを視聴" }));
    const deleteDialog = await screen.findByRole("dialog");
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "削除" }));
    fireEvent.click(within(deleteDialog).getByRole("button", { name: "削除" }));
    await waitForDialogToClose();

    await waitFor(() => expect(screen.queryByRole("button", { name: /を視聴/ })).toBeNull());
    expect(await listWatchEventsForDay(DATE)).toEqual([]);
    expect((await listTombstones()).map((t) => t.table)).toEqual(["WatchEvents"]);
  });

  it("shows an alert and keeps the dialog open when delete fails", async () => {
    vi.spyOn(appDb.exerciseLogs, "delete").mockRejectedValue(new Error("disk full"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    fireEvent.click(await screen.findByRole("button", { name: /肩まわしストレッチ できた/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

    expect((await within(dialog).findByRole("alert")).textContent).toBe(
      "削除できませんでした。もう一度お試しください。",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(await appDb.exerciseLogs.count()).toBe(1);
    expect(await listTombstones()).toEqual([]);
  });

  it("shows the empty message and a link to the library", async () => {
    await appDb.exerciseLogs.clear();
    renderWithLanguage(<Harness />, { initialLanguage: "ja" });

    expect(await screen.findByText("まだ記録はありません。")).toBeTruthy();
    expect(screen.getByRole("link", { name: "動画を選ぶ" }).getAttribute("href")).toBe("/library");
  });

  it("hides the library link on a past day", async () => {
    renderWithLanguage(<Harness date="2026-10-19" />, { initialLanguage: "ja" });

    expect(await screen.findByText("まだ記録はありません。")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "動画を選ぶ" })).toBeNull();
  });
});

