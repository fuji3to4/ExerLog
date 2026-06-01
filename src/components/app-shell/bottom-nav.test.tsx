import { screen } from "@testing-library/react";
import { renderWithLanguage } from "@/test/render-with-language";
import { BottomNav } from "./bottom-nav";

test("marks the current destination as active", () => {
  renderWithLanguage(<BottomNav currentPath="/library" />);

  const navigation = screen.getByRole("navigation", { name: /メイン/i });
  const activeLink = screen.getByRole("link", { name: /ライブラリ/i });
  const activeIcon = activeLink.querySelector("span[aria-hidden='true']");
  const activeLabel = activeLink.querySelector("span:not([aria-hidden='true'])");

  expect(navigation).toHaveClass("fixed", "bottom-0");
  expect(navigation).not.toHaveClass("bottom-nav");
  expect(activeLink).toHaveAttribute("aria-current", "page");
  expect(activeLink).toHaveClass("bg-primary", "text-primary-foreground");
  expect(activeLink).not.toHaveClass("bottom-nav__link");
  expect(activeIcon).not.toHaveClass("bottom-nav__icon");
  expect(activeLabel).not.toHaveClass("bottom-nav__label");
  expect(screen.getByRole("link", { name: /今日/i })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: /履歴/i })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("link", { name: /今日/i })).toHaveClass("text-muted-foreground");
  expect(screen.getByRole("link", { name: /コンディション/i })).toHaveAttribute("href", "/self-care");
});
