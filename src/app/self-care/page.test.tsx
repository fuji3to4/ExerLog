import { screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

const { selfCareScreenSpy } = vi.hoisted(() => ({
  selfCareScreenSpy: vi.fn(() => <section data-testid="self-care-screen">self care</section>),
}));

vi.mock("@/features/self-care/components/self-care-screen", () => ({
  SelfCareScreen: selfCareScreenSpy,
}));

import SelfCarePage from "./page";

beforeEach(() => {
  selfCareScreenSpy.mockClear();
});

test("renders the self care screen in the app shell and exposes the self care nav link", () => {
  renderWithLanguage(<SelfCarePage />);

  expect(screen.getByTestId("self-care-screen")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /セルフケア/i })).toHaveAttribute("href", "/self-care");
  expect(selfCareScreenSpy).toHaveBeenCalled();
});
