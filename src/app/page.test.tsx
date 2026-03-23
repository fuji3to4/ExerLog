import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { todayScreenSpy } = vi.hoisted(() => ({
  todayScreenSpy: vi.fn(({ date }: { date: string }) => <section data-testid="today-screen">{date}</section>),
}));

vi.mock("@/features/today/components/today-screen", () => ({
  TodayScreen: todayScreenSpy,
}));

import HomePage from "./page";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 23, 8, 30));
  todayScreenSpy.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

test("renders the today screen for the home route", () => {
  render(<HomePage />);

  expect(screen.getByTestId("today-screen")).toHaveTextContent("2026-03-23");
  expect(screen.getByRole("link", { name: /library/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /history/i })).toBeInTheDocument();
  expect(todayScreenSpy).toHaveBeenCalled();
});
