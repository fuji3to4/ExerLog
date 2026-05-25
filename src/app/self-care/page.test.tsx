import { expect, test } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithLanguage } from "@/test/render-with-language";

import SelfCarePage from "./page";

test("renders the self care route inside the app shell", () => {
  renderWithLanguage(<SelfCarePage />);

  expect(screen.getByRole("heading", { level: 1, name: /セルフケア/i })).toBeInTheDocument();
  expect(screen.getByText(/この日の体調、身体指標、小さなセルフケアをまとめて記録しましょう。/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /セルフケア/i })).toHaveAttribute("aria-current", "page");
});

test("renders english self care copy when english is selected", () => {
  renderWithLanguage(<SelfCarePage />, { initialLanguage: "en" });

  expect(screen.getByRole("heading", { level: 1, name: /Self Care/i })).toBeInTheDocument();
  expect(screen.getByText(/Track wellness, body metrics, and small self care wins for this day\./i)).toBeInTheDocument();
});
