import { screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderWithLanguage } from "@/test/render-with-language";

const { todayScreenSpy } = vi.hoisted(() => ({
  todayScreenSpy: vi.fn(({ date }: { date: string }) => <section data-testid="today-screen">{date}</section>),
}));

vi.mock("@/features/today/components/today-screen", () => ({
  TodayScreen: todayScreenSpy,
}));

import HomePage from "./page";
import { metadata } from "./layout";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 23, 8, 30));
  todayScreenSpy.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

test("renders the today screen for the home route", () => {
  renderWithLanguage(<HomePage />);

  expect(screen.getByTestId("today-screen")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /ライブラリ/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /履歴/i })).toBeInTheDocument();
  expect(todayScreenSpy).toHaveBeenCalled();
});

test("layout includes installable app metadata", () => {
  expect(metadata.applicationName).toBe("Exercise Log");
  expect(metadata.manifest).toBe("/manifest.webmanifest");
});
