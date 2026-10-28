import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { AddRecordMenu } from "@/features/modules/components/add-record-menu";
import { ModuleRecordDialog } from "@/features/modules/components/module-record-dialog";
import { RECORD_MODULES } from "@/features/modules/registry";
import { appDb } from "@/features/storage/app-db";
import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt } from "@/lib/date/local-iso";
import { renderWithLanguage } from "@/test/render-with-language";
import { compressionModule } from "./module";
import { CompressionSummaryCard } from "./summary-card";

const base = {
  id: "a",
  date: "2026-10-20",
  recordedAt: "2026-10-20T08:10:00+09:00",
  kind: "garment" as const,
  note: "",
  updatedAt: "2026-10-20T08:10:00+09:00",
};

describe("compression module registration", () => {
  it("the add menu lists 着用 6th and opens the form", () => {
    const chosen: { current?: (typeof RECORD_MODULES)[number] } = {};
    renderWithLanguage(<AddRecordMenu modules={RECORD_MODULES} onChoose={(m) => (chosen.current = m)} />, {
      initialLanguage: "ja",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
    const items = screen.getAllByRole("menuitem");
    expect(items[5].textContent).toBe("着用");
    fireEvent.click(items[5]);
    expect(chosen.current?.data.id).toBe("compression");

    renderWithLanguage(
      <ModuleRecordDialog module={chosen.current!} open onOpenChange={vi.fn()} date="2026-10-20" onSaved={vi.fn()} />,
      { initialLanguage: "ja" },
    );
    expect(screen.getByRole("radio", { name: "弾性着衣" })).toBeTruthy();
  });
});

describe("compression timeline card", () => {
  const Card = compressionModule.TimelineCard;

  it("shows the span and wear time of a finished record", () => {
    renderWithLanguage(<Card record={{ ...base, endedAt: "2026-10-20T21:30:00+09:00", note: "きつめ" }} label={null} />, {
      initialLanguage: "ja",
    });
    expect(screen.getByText("弾性着衣 8:10〜21:30（13時間20分）")).toBeTruthy();
    expect(screen.getByText("きつめ")).toBeTruthy();
  });

  it("adds the date when taken off on another day", () => {
    const recordedAt = localIsoAt("2026-10-20", new Date(2026, 0, 1, 8, 10));
    const endedAt = localIsoAt("2026-10-21", new Date(2026, 0, 1, 7, 0));
    renderWithLanguage(<Card record={{ ...base, recordedAt, endedAt }} label={null} />, { initialLanguage: "ja" });
    expect(screen.getByText("弾性着衣 8:10〜10/21 7:00（22時間50分）")).toBeTruthy();
  });

  it("shows wearing for an open record", () => {
    const today = toDayKey(new Date());
    const recordedAt = localIsoAt(today, new Date(2026, 0, 1, 8, 10));
    renderWithLanguage(<Card record={{ ...base, date: today, recordedAt, endedAt: null }} label={null} />, {
      initialLanguage: "ja",
    });
    expect(screen.getByText("弾性着衣 8:10〜 着用中")).toBeTruthy();
  });

  it("dates the start of an open record from an earlier day", () => {
    const recordedAt = localIsoAt("2026-10-27", new Date(2026, 0, 1, 22, 0));
    renderWithLanguage(<Card record={{ ...base, recordedAt, endedAt: null }} label={null} />, {
      initialLanguage: "ja",
    });
    expect(screen.getByText("弾性着衣 10/27 22:00〜 着用中")).toBeTruthy();
  });
});

describe("compression summary card", () => {
  beforeEach(async () => {
    await appDb.compressionRecords.clear();
  });

  it("shows days of the period and the average wear", async () => {
    await appDb.compressionRecords.add({
      ...base,
      recordedAt: "2026-10-20T08:00:00+09:00",
      endedAt: "2026-10-20T21:20:00+09:00",
    });
    renderWithLanguage(
      <CompressionSummaryCard
        period={{ start: localIsoAt("2026-10-01", new Date(2026, 0, 1, 0, 0)), end: localIsoAt("2026-10-30", new Date(2026, 0, 1, 23, 59)) }}
      />,
      { initialLanguage: "ja" },
    );
    await waitFor(() =>
      expect(
        screen.getAllByText((_, el) => el?.tagName === "P" && el.textContent === "弾性着衣 1日／30日・平均 13時間20分"),
      ).toHaveLength(1),
    );
  });
});
