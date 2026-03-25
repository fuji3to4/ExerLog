import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";

import { exerciseCatalog } from "@/features/catalog/exercise-catalog";
import { appDb } from "@/features/storage/app-db";
import { renderWithLanguage } from "@/test/render-with-language";

import { LibraryScreen } from "./components/library-screen";

beforeEach(async () => {
  await appDb.exercises.clear();
  await appDb.exercises.bulkAdd(exerciseCatalog);
});

test("filters the exercise library by body area and duration", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.selectOptions(screen.getByLabelText(/body area/i), "upper-body");
  await user.selectOptions(screen.getByLabelText(/duration/i), "5");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
});

test("filters the exercise library by purpose and intensity", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.selectOptions(screen.getByLabelText(/purpose/i), "mobility");
  await user.selectOptions(screen.getByLabelText(/intensity/i), "low");

  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
});

test("library supports simple text search", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  await screen.findAllByRole("article");

  await user.type(screen.getByLabelText(/search exercises/i), "neck");

  expect(screen.getByRole("article", { name: /neck mobility/i })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: /shoulder rolls/i })).not.toBeInTheDocument();
});

test("library cards link to the exercise detail route", async () => {
  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(await screen.findByRole("link", { name: /watch neck mobility/i })).toHaveAttribute(
    "href",
    "/exercises?exerciseId=neck-mobility-5",
  );
});

test("library shows the shared thumbnail fallback for a blank-thumbnail YouTube exercise", async () => {
  await appDb.exercises.clear();
  await appDb.exercises.add({
    id: "blank-youtube-thumb",
    title: "Blank Thumbnail Exercise",
    description: "",
    videoUrl: "https://youtu.be/dQw4w9WgXcQ",
    thumbnailUrl: "",
    bodyArea: "upper-body",
    purpose: "mobility",
    durationMinutes: 5,
    intensity: "low",
  });

  renderWithLanguage(<LibraryScreen />, { initialLanguage: "en" });

  expect(await screen.findByRole("img", { name: /blank thumbnail exercise/i })).toBeInTheDocument();
});

test("renders Japanese library filters by default", async () => {
  renderWithLanguage(<LibraryScreen />);

  expect(screen.getByRole("heading", { name: /ライブラリ/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/エクササイズを検索/i)).toHaveAttribute("placeholder", "タイトルまたは説明で検索");
  expect(await screen.findByRole("link", { name: /Neck Mobility.*見る/i })).toBeInTheDocument();
});
