import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseLogActions } from "./components/exercise-log-actions";

test("each press logs one more result and there is no clear button", async () => {
  const user = userEvent.setup();
  const onLog = vi.fn();

  renderWithLanguage(<ExerciseLogActions todayCount={2} onLog={onLog} />, { initialLanguage: "en" });

  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /couldn't/i })).toBeNull();
  expect(screen.getByRole("button", { name: /did it/i })).not.toHaveAttribute("aria-pressed");
  expect(screen.getByText("2 times today")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /did it/i }));
  await user.click(screen.getByRole("button", { name: /partly/i }));
  await user.click(screen.getByRole("button", { name: /did it/i }));

  expect(onLog.mock.calls).toEqual([["did"], ["partial"], ["did"]]);
});

test("translates logging buttons and shows not-logged state when count is zero", () => {
  renderWithLanguage(<ExerciseLogActions todayCount={0} onLog={vi.fn()} />);

  const buttons = screen.getAllByRole("button");
  expect(buttons[0]).toHaveTextContent("できた");
  expect(buttons[1]).toHaveTextContent("一部できた");
  expect(screen.getByText("未記録")).toBeInTheDocument();
});

test("shows the Japanese count label", () => {
  renderWithLanguage(<ExerciseLogActions todayCount={3} onLog={vi.fn()} />);

  expect(screen.getByText("今日3回")).toBeInTheDocument();
});

test("shows the all-time count next to the day's count when given, even at zero", () => {
  renderWithLanguage(<ExerciseLogActions todayCount={0} totalCount={0} onLog={vi.fn()} />);
  expect(screen.getByText("今日0回／全0回")).toBeInTheDocument();
});

test("shows the all-time count next to a past day's count", () => {
  renderWithLanguage(<ExerciseLogActions todayCount={1} totalCount={12} onLog={vi.fn()} dayLabel="11/3" />);
  expect(screen.getByText("11/3に1回／全12回")).toBeInTheDocument();
});
