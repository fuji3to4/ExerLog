import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import type { ExerciseSet } from "@/lib/types";

import { SetSwitcher } from "./set-switcher";

const sets: ExerciseSet[] = [
  { id: "a", name: "Morning", exerciseIds: [], createdAt: "2026-10-20T00:00:00+09:00", updatedAt: "2026-10-20T00:00:00+09:00" },
  { id: "b", name: "Evening", exerciseIds: [], createdAt: "2026-10-20T00:00:00+09:00", updatedAt: "2026-10-20T00:00:00+09:00" },
];

test("renders nothing when there are no sets", () => {
  const { container } = render(
    <SetSwitcher ariaLabel="Sets" allLabel="All" sets={[]} selectedId={null} onSelect={() => {}} />,
  );

  expect(container).toBeEmptyDOMElement();
});

test("passes the set id, or null for the first button, to onSelect", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<SetSwitcher ariaLabel="Sets" allLabel="All" sets={sets} selectedId="a" onSelect={onSelect} />);

  await user.click(screen.getByRole("button", { name: "Evening" }));
  expect(onSelect).toHaveBeenLastCalledWith("b");

  await user.click(screen.getByRole("button", { name: "All" }));
  expect(onSelect).toHaveBeenLastCalledWith(null);
});

test("marks the selected button as pressed and shows trailing content", () => {
  render(
    <SetSwitcher
      ariaLabel="Sets"
      allLabel="All"
      sets={sets}
      selectedId="b"
      onSelect={() => {}}
      trailing={<button type="button">More</button>}
    />,
  );

  const group = screen.getByRole("group", { name: "Sets" });
  expect(screen.getByRole("button", { name: "Evening" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Morning" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  expect(group).toContainElement(screen.getByRole("button", { name: "More" }));
});
