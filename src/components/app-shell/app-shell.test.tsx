import { screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { renderWithLanguage } from "@/test/render-with-language";

test("renders shell layout with styled header, content region, and fixed navigation", () => {
  renderWithLanguage(
    <AppShell currentPath="/library">
      <section>content</section>
    </AppShell>,
  );

  expect(screen.getByRole("banner")).toHaveClass("sticky", "top-0");
  expect(screen.getByRole("heading", { name: "ExerLog" })).toHaveClass("text-lg", "font-semibold");
  expect(screen.getByRole("main")).toHaveClass("pb-28");
  expect(screen.getByRole("button", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: /メイン/i })).toHaveClass("fixed", "bottom-0");
});
