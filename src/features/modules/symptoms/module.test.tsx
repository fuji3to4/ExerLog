import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { AddRecordMenu } from "@/features/modules/components/add-record-menu";
import { RECORD_MODULES } from "@/features/modules/registry";
import { useTranslation } from "@/features/i18n/use-translation";
import { appDb } from "@/features/storage/app-db";
import { toDayKey } from "@/lib/date/day-key";
import { localIsoAt } from "@/lib/date/local-iso";
import type { SymptomEntry, SymptomRecord } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { formatSymptomEntry, symptomsModule } from "./module";

function makeRecord(id: string, date: string, symptoms: SymptomEntry[], note = ""): SymptomRecord {
  const at = localIsoAt(date);
  return { id, date, recordedAt: at, symptoms, note, updatedAt: at };
}

describe("symptoms module registration", () => {
  it("the add menu lists 症状 7th", () => {
    const chosen: { current?: (typeof RECORD_MODULES)[number] } = {};
    renderWithLanguage(<AddRecordMenu modules={RECORD_MODULES} onChoose={(m) => (chosen.current = m)} />, {
      initialLanguage: "ja",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "＋ 記録する" }), { key: "Enter" });
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(7);
    expect(items[6].textContent).toBe("症状");
    fireEvent.click(items[6]);
    expect(chosen.current?.data.id).toBe("symptoms");
  });
});

describe("formatSymptomEntry", () => {
  function Probe({ entries }: { entries: SymptomEntry[] }) {
    const { t } = useTranslation();
    return <p>{entries.map((e) => formatSymptomEntry(e, t)).join("|")}</p>;
  }

  it("builds severity, care and site parts", () => {
    renderWithLanguage(
      <Probe
        entries={[
          { id: "edema", severity: 2, sites: ["armLeft"], care: null },
          { id: "pain", severity: 1, sites: [], care: null },
          { id: "edema", severity: null, sites: [], care: null },
          { id: "cellulitis", severity: null, sites: ["legRight"], care: "outpatient" },
          { id: "pain", severity: 3, sites: ["armRight", "legLeft"], care: null },
        ]}
      />,
      { initialLanguage: "ja" },
    );
    expect(
      screen.getByText("むくみ（中・左腕）|痛み（軽）|むくみ|蜂窩織炎（通院・右脚）|痛み（強・右腕・左脚）"),
    ).toBeTruthy();
  });
});

describe("symptoms timeline card", () => {
  const Card = symptomsModule.TimelineCard;

  it("shows 症状なし for an empty record", () => {
    renderWithLanguage(<Card record={makeRecord("a", "2026-10-20", [])} label={null} />, { initialLanguage: "ja" });
    expect(screen.getByText("症状なし")).toBeTruthy();
  });

  it("joins entries with 、 and puts the note below", () => {
    const record = makeRecord(
      "a",
      "2026-10-20",
      [
        { id: "edema", severity: 2, sites: ["armLeft"], care: null },
        { id: "pain", severity: 1, sites: [], care: null },
      ],
      "夕方",
    );
    renderWithLanguage(<Card record={record} label={null} />, { initialLanguage: "ja" });
    expect(screen.getByText("むくみ（中・左腕）、痛み（軽）")).toBeTruthy();
    expect(screen.getByText("夕方")).toBeTruthy();
  });
});

describe("symptoms history view", () => {
  beforeEach(async () => {
    await appDb.symptomRecords.clear();
  });

  it("lists cellulitis records newest first with care and sites", async () => {
    // Days a few days back stay inside the default 30 days whatever the time of day.
    const day = (ago: number) => toDayKey(new Date(Date.now() - ago * 86_400_000));
    const md = (key: string) => {
      const [, m, d] = key.split("-").map(Number);
      return `${m}/${d}`;
    };
    const older = day(5);
    const newer = day(2);
    await appDb.symptomRecords.bulkAdd([
      makeRecord("old", older, [{ id: "cellulitis", severity: null, sites: ["legRight"], care: "outpatient" }]),
      makeRecord("new", newer, [{ id: "cellulitis", severity: null, sites: [], care: "inpatient" }]),
    ]);
    const View = symptomsModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "ja" });
    await waitFor(() => expect(screen.getByText(`${md(older)} 通院・右脚`)).toBeTruthy());
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toEqual([`${md(newer)} 入院`, `${md(older)} 通院・右脚`]);
  });

  it("shows no list without cellulitis", async () => {
    await appDb.symptomRecords.add(
      makeRecord("a", toDayKey(new Date()), [{ id: "edema", severity: 3, sites: ["armLeft"], care: null }]),
    );
    const View = symptomsModule.HistoryView;
    renderWithLanguage(<View />, { initialLanguage: "ja" });
    await waitFor(() => expect(screen.getByText("記録 1日（症状なし 0日）")).toBeTruthy());
    expect(screen.getAllByText((_, el) => el?.tagName === "P" && el.textContent === "むくみ 1日・最大 強・左腕")).toHaveLength(1);
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
