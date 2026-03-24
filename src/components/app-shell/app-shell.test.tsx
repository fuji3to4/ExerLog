import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { renderWithLanguage } from "@/test/render-with-language";

test("shows the language switcher in the header on mobile-sized layouts", () => {
  renderWithLanguage(
    <AppShell currentPath="/">
      <section>content</section>
    </AppShell>,
  );

  expect(screen.getByRole("button", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: /メイン/i })).toBeInTheDocument();
});
