import { screen } from "@testing-library/react";
import { renderWithLanguage } from "@/test/render-with-language";
import { BottomNav } from "./bottom-nav";

test("marks the current destination as active", () => {
  renderWithLanguage(<BottomNav currentPath="/library" />);

  const navigation = screen.getByRole("navigation", { name: /メイン/i });
  const activeLink = screen.getByRole("link", { name: /ライブラリ/i });

  expect(navigation).toHaveClass("fixed", "bottom-0");
  expect(activeLink).toHaveAttribute("aria-current", "page");
  expect(activeLink).toHaveClass("bg-primary", "text-primary-foreground");
  expect(screen.getByRole("link", { name: /今日/i })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: /履歴/i })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: /今日/i })).toHaveClass("text-muted-foreground");
  expect(screen.getByRole("link", { name: /コンディション/i })).toHaveAttribute("href", "/self-care");
});
