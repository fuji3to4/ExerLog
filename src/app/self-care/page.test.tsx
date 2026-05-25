import { screen } from "@testing-library/react";

import { renderWithLanguage } from "@/test/render-with-language";

import SelfCarePage from "./page";

test("renders the self care route inside the app shell", () => {
  renderWithLanguage(<SelfCarePage />);

  expect(screen.getByRole("heading", { name: /セルフケア/i })).toBeInTheDocument();
  expect(screen.getByText(/今日のために短いセルフケアの記録を残しましょう。/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /セルフケア/i })).toHaveAttribute("aria-current", "page");
});

test("renders english self care copy when english is selected", () => {
  renderWithLanguage(<SelfCarePage />, { initialLanguage: "en" });

  expect(screen.getByRole("heading", { name: /Self Care/i })).toBeInTheDocument();
  expect(screen.getByText(/Save a short self care note for today\./i)).toBeInTheDocument();
});
