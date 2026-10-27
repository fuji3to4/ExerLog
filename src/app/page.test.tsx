import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MockSyncProvider } from "@/test/mock-sync-provider";
import { renderWithLanguage } from "@/test/render-with-language";

const { todayScreenSpy } = vi.hoisted(() => ({
  todayScreenSpy: vi.fn(({ date }: { date: string }) => <section data-testid="today-screen">{date}</section>),
}));

vi.mock("@/features/today/components/today-screen", () => ({
  TodayScreen: todayScreenSpy,
}));

// The PC layout also shows the history dashboard; keep its IndexedDB reads out of this fake-timer test.
vi.mock("@/features/history/components/history-dashboard", () => ({
  HistoryDashboard: () => <section data-testid="history-dashboard" />,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/features/sync/auto-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/sync/auto-sync")>()),
  scheduleSync: vi.fn(),
}));

import { CelebrationProvider } from "@/features/feedback/celebration";
import { appDb } from "@/features/storage/app-db";
import { replaceAllExercises } from "@/features/storage/exercise-catalog.repository";
import { listExerciseLogsForDay } from "@/features/storage/exercise-logs.repository";
import type { ExerciseDraft } from "@/lib/types";
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
  renderWithLanguage(
    <MockSyncProvider>
      <HomePage />
    </MockSyncProvider>,
  );

  // Mobile and PC layouts each render the today screen and a navigation.
  expect(screen.getAllByTestId("today-screen").length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: /ライブラリ/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: /履歴/i }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("link", { name: /コンディション/i })).not.toBeInTheDocument();
  expect(todayScreenSpy).toHaveBeenCalled();
});

test("layout includes installable app metadata", () => {
  expect(metadata.applicationName).toBe("Exercise Log");
  expect(metadata.manifest).toBe("/ExerLog/manifest.webmanifest");
});

describe("today screen timeline", () => {
  const DATE = "2026-10-20";

  function exercise(id: string, title: string, intensity: ExerciseDraft["intensity"]): ExerciseDraft {
    return {
      id,
      title,
      description: "",
      videoUrl: "",
      thumbnailUrl: "",
      bodyArea: "full-body",
      purpose: "mobility",
      durationSeconds: 300,
      intensity,
    };
  }

  // Read back in id order; on 2026-10-20 (offset 10*20=200): "okay" shows Delta, Epsilon, Gamma;
  // "tired" drops high-intensity items and shows Zeta, Delta, Epsilon.
  const catalog = [
    exercise("alpha", "Alpha", "high"),
    exercise("beta", "Beta", "high"),
    exercise("gamma", "Gamma", "high"),
    exercise("delta", "Delta", "low"),
    exercise("epsilon", "Epsilon", "low"),
    exercise("zeta", "Zeta", "low"),
  ];

  async function renderTodayScreen() {
    const { TodayScreen } = await vi.importActual<typeof import("@/features/today/components/today-screen")>(
      "@/features/today/components/today-screen",
    );
    renderWithLanguage(
      <CelebrationProvider>
        <TodayScreen date={DATE} />
      </CelebrationProvider>,
      { initialLanguage: "ja" },
    );
  }

  beforeEach(async () => {
    // Only Date is faked so that "now" is 20:00 on DATE; timers stay real.
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 20, 0, 0));
    await Promise.all([
      appDb.exerciseLogs.clear(),
      appDb.wellnessEntries.clear(),
      appDb.watchEvents.clear(),
      appDb.tombstones.clear(),
      appDb.exercises.clear(),
    ]);
    await replaceAllExercises(catalog);
  });

  test("shows the add-record button on the today screen", async () => {
    await renderTodayScreen();

    expect(await screen.findByRole("button", { name: "＋ 記録する" })).toBeInTheDocument();
  });

  test("logging an exercise adds a timeline row, celebrates and counts repeats", async () => {
    await renderTodayScreen();

    const card = await screen.findByRole("article", { name: "Delta" });
    fireEvent.click(within(card).getByRole("button", { name: "できた" }));

    expect(await screen.findByRole("button", { name: /Delta できた/ })).toBeInTheDocument();
    expect(await screen.findByText(/おつかれさま！ 5分 やりました/)).toBeInTheDocument();
    await waitFor(() => expect(within(card).getByText("今日1回")).toBeInTheDocument());

    fireEvent.click(within(card).getByRole("button", { name: "できた" }));

    await waitFor(() => expect(within(card).getByText("今日2回")).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Delta できた/ })).toHaveLength(2));
    const logs = await listExerciseLogsForDay(DATE);
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ exerciseId: "delta", result: "did", durationSeconds: 300 });
    expect(logs[0].performedAt.startsWith(`${DATE}T20:00`)).toBe(true);
  });

  test("a low condition entry switches recommendations to the tired set", async () => {
    await renderTodayScreen();

    expect(await screen.findByRole("heading", { name: "Gamma" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Zeta" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "＋ 記録する" }));
    const sheet = await screen.findByRole("dialog", { name: "何を記録しますか？" });
    fireEvent.click(within(sheet).getByRole("button", { name: "体調" }));
    const dialog = await screen.findByRole("dialog", { name: "記録する" });
    fireEvent.click(within(within(dialog).getByRole("group", { name: "からだ" })).getByRole("button", { name: "1" }));
    fireEvent.click(within(within(dialog).getByRole("group", { name: "こころ" })).getByRole("button", { name: "1" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Zeta" })).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(screen.queryByRole("heading", { name: "Gamma" })).toBeNull();
  });
});
