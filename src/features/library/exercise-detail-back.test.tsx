import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseDetailLoader } from "./components/exercise-detail-loader";

beforeEach(() => {
  router.back.mockReset();
  router.push.mockReset();
});

test("goes back to the previous page when there is one", async () => {
  const user = userEvent.setup();
  vi.spyOn(window.history, "length", "get").mockReturnValue(3);

  renderWithLanguage(<ExerciseDetailLoader exerciseId="missing" />, { initialLanguage: "en" });

  await user.click(screen.getByRole("button", { name: /back/i }));

  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
});

test("falls back to the library when the page was opened directly", async () => {
  const user = userEvent.setup();
  vi.spyOn(window.history, "length", "get").mockReturnValue(1);

  renderWithLanguage(<ExerciseDetailLoader exerciseId="missing" />, { initialLanguage: "en" });

  await user.click(screen.getByRole("button", { name: /back/i }));

  expect(router.push).toHaveBeenCalledWith("/library");
  expect(router.back).not.toHaveBeenCalled();
});
