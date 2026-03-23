import { render, screen } from "@testing-library/react";
import HomePage from "./page";

test("renders the primary navigation labels", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: /today/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /library/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument();
});
