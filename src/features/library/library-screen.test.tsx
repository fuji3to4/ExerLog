import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { LibraryScreen } from "./components/library-screen";

test("filters the exercise library by body area and duration", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");
  await user.selectOptions(screen.getByLabelText(/duration/i), "5");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
});

test("filters the exercise library by purpose and intensity", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await user.selectOptions(screen.getByLabelText(/purpose/i), "mobility");
  await user.selectOptions(screen.getByLabelText(/intensity/i), "low");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
});

test("library supports simple text search", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await user.type(screen.getByLabelText(/search exercises/i), "neck");

  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: /shoulder rolls/i })).not.toBeInTheDocument();
});

test("library cards link to the exercise detail route", () => {
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(screen.getByRole("link", { name: /watch neck mobility/i })).toHaveAttribute(
    "href",
    "/exercises/neck-mobility-5",
  );
});

test("renders Japanese library filters by default", () => {
  renderWithLanguage(<LibraryScreen />);

  expect(screen.getByRole("heading", { name: /ライブラリ/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/エクササイズを検索/i)).toHaveAttribute("placeholder", "タイトルまたは説明で検索");
  expect(screen.getByRole("link", { name: /Neck Mobility.*見る/i })).toBeInTheDocument();
});
