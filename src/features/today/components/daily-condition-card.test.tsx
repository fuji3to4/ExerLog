import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { DailyConditionCard } from "./daily-condition-card";

function renderCard(overrides: Partial<Parameters<typeof DailyConditionCard>[0]> = {}) {
  return renderWithLanguage(
    <DailyConditionCard
      physicalScore={3}
      mentalScore={3}
      note=""
      onPhysicalScoreChange={() => {}}
      onMentalScoreChange={() => {}}
      onNoteChange={() => {}}
      onSave={() => {}}
      {...overrides}
    />,
    { initialLanguage: "en" },
  );
}

test("shows a save error alert when saveError prop is provided", () => {
  renderCard({ saveError: "Failed to save. Please try again." });

  expect(screen.getByRole("alert")).toHaveTextContent("Failed to save");
});

test("does not render an error alert when saveError is not provided", () => {
  renderCard();

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
