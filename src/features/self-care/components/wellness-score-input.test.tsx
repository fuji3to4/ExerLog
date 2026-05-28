import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { WellnessScoreInput } from "./wellness-score-input";

function renderInput(
  value: 1 | 2 | 3 | 4 | 5 = 3,
  onChange: (s: 1 | 2 | 3 | 4 | 5) => void = () => {},
) {
  return renderWithLanguage(
    <WellnessScoreInput label="Physical" value={value} onChange={onChange} />,
    { initialLanguage: "en" },
  );
}

test("renders 5 score buttons inside a group", () => {
  renderInput();
  const group = screen.getByRole("group", { name: "Physical" });
  expect(within(group).getAllByRole("button")).toHaveLength(5);
});

test("marks only the current value as pressed", () => {
  renderInput(3);
  expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "false");
});

test("calls onChange with the clicked score value", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  renderInput(3, onChange);

  await user.click(screen.getByRole("button", { name: "5" }));

  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(5);
});

test("shows low and high hint labels in English", () => {
  renderInput();
  expect(screen.getByText("😞 Worst")).toBeInTheDocument();
  expect(screen.getByText("Best 😄")).toBeInTheDocument();
});
