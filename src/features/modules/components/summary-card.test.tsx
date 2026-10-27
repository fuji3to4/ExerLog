import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "./summary-card";

const PERIOD = { start: "2026-10-01T00:00:00+09:00", end: "2026-10-27T23:00:00+09:00" };
const EMPTY = { summary: null as string | null };

function Card({ load }: { load: () => Promise<{ summary: string | null }> }) {
  const loaded = usePeriodSummary(PERIOD, load, EMPTY);
  return (
    <SummaryCardFrame title="card">
      {loaded === undefined ? null : loaded.summary === null ? <SummaryEmpty /> : <p>{loaded.summary}</p>}
    </SummaryCardFrame>
  );
}

describe("usePeriodSummary", () => {
  it("renders the loaded summary", async () => {
    renderWithLanguage(<Card load={() => Promise.resolve({ summary: "ok" })} />, { initialLanguage: "ja" });
    expect(await screen.findByText("ok")).toBeTruthy();
  });

  it("logs and shows 記録なし when the load rejects", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderWithLanguage(<Card load={() => Promise.reject(new Error("dexie"))} />, { initialLanguage: "ja" });
    await waitFor(() => expect(screen.getByText("記録なし")).toBeTruthy());
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
