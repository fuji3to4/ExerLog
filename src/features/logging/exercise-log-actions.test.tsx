import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseLogActions } from "./components/exercise-log-actions";

test("shows all shared logging actions and the current saved state", async () => {
  const user = userEvent.setup();
  const onLog = vi.fn();

  renderWithLanguage(<ExerciseLogActions result="partial" onLog={onLog} />, { initialLanguage: "en" });

  const didItButton = screen.getByRole("button", { name: /did it/i });
  const partlyButton = screen.getByRole("button", { name: /partly/i });
  const couldntButton = screen.getByRole("button", { name: /couldn't/i });

  expect(didItButton).toHaveAttribute("aria-pressed", "false");
  expect(partlyButton).toHaveAttribute("aria-pressed", "true");
  expect(couldntButton).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText("Saved: Partly")).toBeInTheDocument();

  await user.click(couldntButton);

  expect(onLog).toHaveBeenCalledWith("could_not");
});

test("translates logging buttons and saved state text", () => {
  renderWithLanguage(<ExerciseLogActions result="did" onLog={vi.fn()} />);

  const buttons = screen.getAllByRole("button");
  expect(buttons[0]).toHaveTextContent("できた");
  expect(buttons[1]).toHaveTextContent("一部できた");
  expect(buttons[2]).toHaveTextContent("できなかった");
  expect(screen.getByText("保存済み: できた")).toBeInTheDocument();
});
