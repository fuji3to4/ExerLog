import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { AddRecordMenu } from "@/features/modules/components/add-record-menu";
import { ModuleRecordDialog } from "@/features/modules/components/module-record-dialog";
import { RECORD_MODULES } from "@/features/modules/registry";
import { appDb } from "@/features/storage/app-db";
import { localIsoNow } from "@/lib/date/local-iso";
import { toDayKey } from "@/lib/date/day-key";
import { renderWithLanguage } from "@/test/render-with-language";
import { selfCareModule } from "./module";

const base = { id: "a", date: "2026-10-20", recordedAt: "2026-10-20T08:00:00+09:00", updatedAt: "2026-10-20T08:00:00+09:00" };

describe("selfcare module registration", () => {
  it("the add menu lists セルフケア 6th and opens セルフケアを記録", () => {
    const chosen: { current?: (typeof RECORD_MODULES)[number] } = {};
    renderWithLanguage(<AddRecordMenu modules={RECORD_MODULES} onChoose={(m) => (chosen.current = m)} />, {
      initialLanguage: "ja",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
    const items = screen.getAllByRole("menuitem");
    expect(items[5].textContent).toBe("セルフケア");
    fireEvent.click(items[5]);
    expect(chosen.current?.data.id).toBe("selfcare");

    renderWithLanguage(
      <ModuleRecordDialog module={chosen.current!} open onOpenChange={vi.fn()} date="2026-10-20" onSaved={vi.fn()} />,
      { initialLanguage: "ja" },
    );
    expect(screen.getByText("セルフケアを記録")).toBeTruthy();
  });
});

describe("selfcare timeline card", () => {
  const Card = selfCareModule.TimelineCard;

  it("shows item and minutes, then the note", () => {
    renderWithLanguage(<Card record={{ ...base, item: "exercise", minutes: 30, note: "散歩" }} label={null} />, {
      initialLanguage: "ja",
    });
    expect(screen.getByText("運動 30分")).toBeTruthy();
    expect(screen.getByText("散歩")).toBeTruthy();
  });

  it("puts the note of other on the same line", () => {
    renderWithLanguage(<Card record={{ ...base, item: "other", minutes: null, note: "リンパドレナージ" }} label={null} />, {
      initialLanguage: "ja",
    });
    expect(screen.getByText("その他：リンパドレナージ")).toBeTruthy();
    expect(screen.queryByText("リンパドレナージ")).toBeNull();
  });
});

describe("selfcare history view", () => {
  beforeEach(async () => {
    await appDb.selfCareRecords.clear();
  });

  it("summarizes the last 30 days by default", async () => {
    const now = localIsoNow();
    await appDb.selfCareRecords.add({
      ...base,
      id: "today",
      date: toDayKey(new Date()),
      recordedAt: now,
      item: "skincare",
      minutes: null,
      note: "",
    });
    const View = selfCareModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "ja" });
    await waitFor(() =>
      expect(screen.getAllByText((_, el) => el?.tagName === "P" && el.textContent === "スキンケア 1日／30日")).toHaveLength(1),
    );
  });

  async function addExercise(id: string, minutes: number | null) {
    await appDb.selfCareRecords.add({
      ...base,
      id,
      date: toDayKey(new Date()),
      recordedAt: localIsoNow(),
      item: "exercise",
      minutes,
      note: "",
    });
  }

  it("omits the total when no exercise record has minutes", async () => {
    await addExercise("e1", null);
    const View = selfCareModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "ja" });
    await waitFor(() => expect(screen.getByText(/運動/)).toBeTruthy());
    expect(screen.queryByText(/合計/)).toBeNull();
  });

  it("shows the total when minutes exist", async () => {
    await addExercise("e1", 45);
    const View = selfCareModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "ja" });
    await waitFor(() => expect(screen.getByText(/合計 45分/)).toBeTruthy());
  });

  it("uses an English separator", async () => {
    await addExercise("e1", 45);
    const View = selfCareModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "en" });
    await waitFor(() => expect(screen.getByText(/45 min in total/)).toBeTruthy());
    expect(document.body.textContent).not.toContain("・");
  });
});

describe("selfcare timeline card (en)", () => {
  it("separates other and its note with an ASCII colon", () => {
    const Card = selfCareModule.TimelineCard;
    renderWithLanguage(<Card record={{ ...base, item: "other", minutes: null, note: "Drainage" }} label={null} />, {
      initialLanguage: "en",
    });
    expect(screen.getByText("Other: Drainage")).toBeTruthy();
  });
});
