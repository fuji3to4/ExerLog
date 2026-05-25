import { expect, test } from "vitest";
import { screen } from "@testing-library/react";

import { renderWithLanguage } from "@/test/render-with-language";

import SelfCarePage from "./page";

test("renders the self care route inside the app shell", () => {
  renderWithLanguage(<SelfCarePage />);

  expect(screen.getByRole("heading", { name: /コンディション/i })).toBeInTheDocument();
  expect(screen.getByText(/体と心を見直して/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /コンディション/i })).toHaveAttribute("aria-current", "page");
});

test("renders english self care copy when english is selected", () => {
  renderWithLanguage(<SelfCarePage />, { initialLanguage: "en" });

  expect(screen.getByRole("heading", { name: /Condition/i })).toBeInTheDocument();
  expect(screen.getByText(/Review your body and mind/i)).toBeInTheDocument();
});
