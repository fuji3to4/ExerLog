import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import type { CustomRecord, CustomRecordType } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { parseDefinition } from "./definition";
import { createCustomModule, graphMetrics } from "./module";

const parsed = parseDefinition({
  id: "protein",
  name: "プロテイン",
  icon: "🥤",
  color: "#5f9e7a",
  description: "量・種類・タイミング",
  fields: [
    { id: "amount", label: "量", type: "number", unit: "g" },
    { id: "kind", label: "種類", type: "choice", options: [{ id: "whey", label: "ホエイ" }] },
    { id: "timing", label: "タイミング", type: "multiChoice", options: [{ id: "post", label: "トレ後" }] },
  ],
});
if (!parsed.ok) throw new Error("fixture");
const type: CustomRecordType = { id: "protein", definition: parsed.definition, deleted: false, updatedAt: "" };
const record: CustomRecord = {
  id: "r1",
  typeId: "protein",
  date: "2026-10-20",
  recordedAt: "2026-10-20T08:00:00+09:00",
  values: { amount: 30, kind: "whey", timing: ["post"] },
  note: "ふつう",
  updatedAt: "",
};

describe("createCustomModule", () => {
  it("describes the module from the definition", () => {
    const m = createCustomModule(type);
    expect(m.naming).toMatchObject({ kind: "text", label: "プロテイン", emoji: "🥤" });
    expect(m.color).toBe("#5f9e7a");
    expect(m.isCustom).toBe(true);
    expect(m.hidden).toBe(false);
    expect(m.tags).toBeUndefined();
    expect(m.data.id).toBe("custom:protein");
  });

  it("marks deleted types hidden", () => {
    expect(createCustomModule({ ...type, deleted: true }).hidden).toBe(true);
  });

  it("renders the timeline card line and note", () => {
    const { TimelineCard } = createCustomModule(type);
    renderWithLanguage(<TimelineCard record={record} label={null} />, { initialLanguage: "ja" });
    expect(screen.getByText("30 g・ホエイ・トレ後")).toBeInTheDocument();
    expect(screen.getByText("ふつう")).toBeInTheDocument();
  });

  it("offers a graph metric named after the numeric field", () => {
    const { HistoryView } = createCustomModule(type);
    renderWithLanguage(<HistoryView />, { initialLanguage: "ja" });
    expect(screen.getByRole("option", { name: "量" })).toBeInTheDocument();
  });

  describe("graph metrics", () => {
    beforeEach(async () => {
      await appDb.customRecords.clear();
    });

    it("plots raw sheet strings of restored number fields", async () => {
      await appDb.customRecords.bulkAdd([
        record,
        { ...record, id: "r2", recordedAt: "2026-10-20T09:00:00+09:00", values: { amount: "40" } },
        { ...record, id: "r3", recordedAt: "2026-10-20T10:00:00+09:00", values: { amount: "x" } },
      ]);
      const [metric] = graphMetrics(type.definition, "ja");
      const result = await metric.load({ start: "2026-10-01", end: "2026-10-31" });
      expect(result.points.map((p) => p.value)).toEqual([30, 40]);
    });
  });
});
