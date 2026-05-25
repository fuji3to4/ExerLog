import { screen } from "@testing-library/react";
import { renderWithLanguage } from "@/test/render-with-language";
import { BottomNav } from "./bottom-nav";

test("marks the current destination as active", () => {
  renderWithLanguage(<BottomNav currentPath="/library" />);

  expect(screen.getByRole("link", { name: /ライブラリ/i })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: /今日/i })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: /履歴/i })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: /セルフケア/i })).toHaveAttribute("href", "/self-care");
});
