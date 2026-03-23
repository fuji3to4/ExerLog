import { render, screen } from "@testing-library/react";
import HomePage from "./page";

test("renders the primary navigation labels", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: /today/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /library/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument();
});

test("does not show non-functional quick-start actions", () => {
  render(<HomePage />);

  expect(screen.getByText(/use the main tabs below to browse the exercise library or review past sessions/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /start log/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /plan session/i })).not.toBeInTheDocument();
});
