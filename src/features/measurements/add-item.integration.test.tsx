import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});
vi.mock("@/features/history/history-graph-query", () => ({
  buildHistoryGraphSeries: vi.fn().mockResolvedValue({ unit: "kg", decimals: 1, points: [] }),
}));

// Adding one entry to MEASUREMENT_ITEMS is all it takes for every surface to pick it up. The real
// module's helpers read their own array binding, so the item is appended to that same array.
vi.mock("./measurement-items", async () => {
  const actual = await vi.importActual<typeof import("./measurement-items")>("./measurement-items");
  (actual.MEASUREMENT_ITEMS as MeasurementItem[]).push({
    id: "waist",
    labelKey: "measurement_item_weight",
    unit: "cm",
    decimals: 1,
    min: 1,
    max: 300,
    showInGraph: true,
  });
  return actual;
});

import { HistoryGraphs } from "@/features/history/components/history-graphs";
import { generateMeasurementsCsv } from "@/features/settings/csv/history-csv";
import { TABLE_SYNC_CONFIGS } from "@/features/sync/sync-config";
import { RecordDialog } from "@/features/timeline/components/record-dialog";
import type { MeasurementRecord } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { MEASUREMENT_ITEMS, formatMeasurementSummary, type MeasurementItem } from "./measurement-items";

const record: MeasurementRecord = {
  id: "m1",
  date: "2026-10-20",
  recordedAt: "2026-10-20T07:00:00+09:00",
  values: { weight: 60.2, waist: 80 },
  note: "",
  updatedAt: "2026-10-20T07:00:00+09:00",
};

describe("adding one item to MEASUREMENT_ITEMS", () => {
  it("(a) shows a fourth input with unit cm in the record dialog", async () => {
    window.localStorage.clear();
    renderWithLanguage(<RecordDialog open onOpenChange={vi.fn()} date="2026-10-20" onSaved={vi.fn()} />, {
      initialLanguage: "ja",
    });
    fireEvent.click(await screen.findByRole("tab", { name: "体の数値" }));

    const dialog = within(screen.getByRole("dialog"));
    // 4 basic inputs (incl. waist) + 20 circumference inputs; the form lists them flat until it groups by limb.
    expect(dialog.getAllByRole("spinbutton")).toHaveLength(4 + 20);
    expect(dialog.getAllByText("cm")).toHaveLength(2 + 20); // height and waist + 20 circumference units
  });

  it("(b) includes waist in the measurement summary", () => {
    const summary = formatMeasurementSummary(record, (key) => (key === "measurement_item_weight" ? "体重" : String(key)));
    expect(summary).toContain("80.0cm");
  });

  it("(c) adds waist to the sheet headers", () => {
    const config = TABLE_SYNC_CONFIGS.find((c) => c.tabName === "Measurements")!;
    expect(config.buildHeaders!([])).toContain("waist");
  });

  it("(d) adds waist to the CSV header", () => {
    expect(generateMeasurementsCsv([record]).split("\n")[0]).toContain("waist");
  });

  it("(e) adds one graph option", async () => {
    renderWithLanguage(<HistoryGraphs />, { initialLanguage: "ja" });
    const select = (await screen.findByLabelText("表示する項目")) as HTMLSelectElement;
    // 4 graphable items + BMI + 2 wellness scores; the 20 circumference items are showInGraph=false
    expect(MEASUREMENT_ITEMS).toHaveLength(24);
    expect(select.options).toHaveLength(7);
  });
});
