import { screen, within } from "@testing-library/react";
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
  buildCircumferenceSeries: vi.fn().mockResolvedValue([]),
}));

// Adding one entry to BODY_ITEMS is all it takes for every body surface to pick it up. The real
// module's helpers read their own array binding, so the item is appended to that same array.
vi.mock("./measurement-items", async () => {
  const actual = await vi.importActual<typeof import("./measurement-items")>("./measurement-items");
  (actual.BODY_ITEMS as MeasurementItem[]).push({
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
import { ModuleRecordDialog } from "@/features/modules/components/module-record-dialog";
import { getRecordModule } from "@/features/modules/registry";
import { generateMeasurementsCsv } from "@/features/settings/csv/history-csv";
import { tableSyncConfigs } from "@/features/sync/sync-config";
import type { MeasurementRecord } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { BODY_ITEMS, formatMeasurementSummary, type MeasurementItem } from "./measurement-items";

const record: MeasurementRecord = {
  id: "m1",
  date: "2026-10-20",
  recordedAt: "2026-10-20T07:00:00+09:00",
  values: { weight: 60.2, waist: 80 },
  note: "",
  updatedAt: "2026-10-20T07:00:00+09:00",
};

describe("adding one item to BODY_ITEMS", () => {
  it("(a) shows a fourth input with unit cm in the body form", async () => {
    window.localStorage.clear();
    renderWithLanguage(
      <ModuleRecordDialog
        module={getRecordModule("body")!}
        open
        onOpenChange={vi.fn()}
        date="2026-10-20"
        onSaved={vi.fn()}
      />,
      { initialLanguage: "ja" },
    );

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getAllByRole("spinbutton")).toHaveLength(4);
    // height and waist
    expect(dialog.getAllByText("cm")).toHaveLength(2);
  });

  it("(b) includes waist in the measurement summary", () => {
    const summary = formatMeasurementSummary(record, BODY_ITEMS, (key) => (key === "measurement_item_weight" ? "体重" : String(key)));
    expect(summary).toContain("80.0cm");
  });

  it("(c) adds waist to the sheet headers", () => {
    const config = tableSyncConfigs().find((c) => c.tabName === "BodyMeasurements")!;
    expect(config.buildHeaders!([])).toContain("waist");
  });

  it("(d) adds waist to the CSV header", () => {
    expect(generateMeasurementsCsv([record], BODY_ITEMS).split("\n")[0]).toContain("waist");
  });

  it("(e) adds one graph option", async () => {
    renderWithLanguage(<HistoryGraphs />, { initialLanguage: "ja" });
    const select = (await screen.findByLabelText("表示する項目")) as HTMLSelectElement;
    // 4 graphable body items + circumference + BMI + 2 wellness scores
    expect(BODY_ITEMS).toHaveLength(4);
    expect(select.options).toHaveLength(8);
  });
});
