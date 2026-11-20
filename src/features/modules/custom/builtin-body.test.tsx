import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/sync/auto-sync", () => ({ scheduleSync: vi.fn() }));

import { appDb } from "@/features/storage/app-db";
import type { CustomRecord } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { getRecordModule } from "../registry";
import { bodyExtras } from "./builtin-body";

const DATE = "2026-10-20";

function body(id: string, recordedAt: string, values: CustomRecord["values"]): CustomRecord {
  return { id, typeId: "body", date: recordedAt.slice(0, 10), recordedAt, values, note: "", updatedAt: "" };
}

const FIRST = body("b1", "2026-10-20T08:00:00+09:00", { weight: 60, height: 170 });
const SECOND = body("b2", "2026-10-20T20:00:00+09:00", { weight: 65 });

beforeEach(async () => {
  await appDb.customRecords.clear();
});

function renderForm() {
  const { Form } = getRecordModule("body")!;
  renderWithLanguage(<Form onOpenChange={vi.fn()} date={DATE} onSaved={vi.fn()} />, { initialLanguage: "ja" });
}

describe("body BMI", () => {
  it("shows BMI from the weight and height typed in the form", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/体重/), { target: { value: "60" } });
    fireEvent.change(screen.getByLabelText(/身長/), { target: { value: "170" } });
    expect(await screen.findByText("BMI 20.8")).toBeInTheDocument();
  });

  it("uses the latest earlier height when the form has none", async () => {
    await appDb.customRecords.add(body("old", "2000-01-01T08:00:00+09:00", { height: 170 }));
    renderForm();
    fireEvent.change(screen.getByLabelText(/体重/), { target: { value: "60" } });
    expect(await screen.findByText("BMI 20.8")).toBeInTheDocument();
  });

  it("asks for a height when none was ever recorded", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(/体重/), { target: { value: "60" } });
    expect(await screen.findByText("身長を記録するとBMIが出ます")).toBeInTheDocument();
  });

  it("adds a BMI graph metric whose points follow the latest earlier height", async () => {
    await appDb.customRecords.bulkAdd([FIRST, SECOND]);
    const { HistoryView } = getRecordModule("body")!;
    renderWithLanguage(<HistoryView />, { initialLanguage: "ja" });
    expect(screen.getByRole("option", { name: "BMI" })).toBeInTheDocument();

    const metric = bodyExtras.graphMetrics!(getRecordModule("body")!.data as never).find((m) => m.labelKey === "history_graph_metric_bmi")!;
    const series = await metric.load({ start: "2026-10-01", end: "2026-10-31" });
    expect(series.unit).toBe("");
    expect(series.decimals).toBe(1);
    expect(series.points.map((p) => p.value)).toEqual([20.8, 22.5]);
  });

  it("shows BMI of the last weight in the period summary", async () => {
    await appDb.customRecords.bulkAdd([FIRST, SECOND]);
    const SummaryExtra = bodyExtras.SummaryExtra!;
    renderWithLanguage(<SummaryExtra records={[FIRST, SECOND]} />, { initialLanguage: "ja" });
    expect(await screen.findByText("BMI 22.5")).toBeInTheDocument();
  });
});
