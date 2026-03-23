import { render, screen } from "@testing-library/react";
import { BottomNav } from "./bottom-nav";

test("marks the current destination as active", () => {
  render(<BottomNav currentPath="/library" />);

  expect(screen.getByRole("link", { name: /library/i })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: /today/i })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: /history/i })).not.toHaveAttribute("aria-current");
});
