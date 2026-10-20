import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

const mockSyncIfNeeded = vi.hoisted(() => vi.fn());
vi.mock("@/features/sync/auto-sync", () => ({
  scheduleSync: vi.fn(),
  syncIfNeeded: mockSyncIfNeeded,
}));

import { renderWithLanguage } from "@/test/render-with-language";
import type { ExerciseVideo } from "@/lib/types";

import { appDb } from "./app-db";
import { DbInitProvider } from "./db-init-provider";

const customExercise: ExerciseVideo = {
  id: "custom-exercise",
  title: "Custom",
  description: "",
  videoUrl: "https://example.com/video",
  thumbnailUrl: "",
  bodyArea: "upper-body",
  purpose: "mobility",
  durationSeconds: 300,
  intensity: "low",
  updatedAt: "2026-10-20T00:00:00+09:00",
};

beforeEach(async () => {
  await appDb.exercises.clear();
  await appDb.selfCareCatalog.clear();
  mockSyncIfNeeded.mockReset();
  mockSyncIfNeeded.mockResolvedValue("not-connected");
});

function renderProvider() {
  renderWithLanguage(
    <DbInitProvider>
      <p>app content</p>
    </DbInitProvider>,
    { initialLanguage: "en" },
  );
}

test("syncs first and does not ask when the sync pulled the remote library", async () => {
  mockSyncIfNeeded.mockImplementation(async () => {
    await appDb.exercises.add(customExercise);
    return "synced";
  });

  renderProvider();

  await waitFor(() => expect(mockSyncIfNeeded).toHaveBeenCalledTimes(1));
  await waitFor(async () => expect(await appDb.exercises.count()).toBe(1));
  expect(screen.queryByText("Import starter exercises?")).not.toBeInTheDocument();
});

test("asks after a successful sync when the remote library is empty too", async () => {
  mockSyncIfNeeded.mockResolvedValue("synced");

  renderProvider();

  expect(await screen.findByText("Import starter exercises?")).toBeInTheDocument();
  expect(mockSyncIfNeeded).toHaveBeenCalledTimes(1);
});

test("does not ask when the sync before seeding fails", async () => {
  mockSyncIfNeeded.mockResolvedValue("failed");

  renderProvider();

  await waitFor(() => expect(mockSyncIfNeeded).toHaveBeenCalledTimes(1));
  await waitFor(async () => expect(await appDb.selfCareCatalog.count()).toBeGreaterThan(0));
  expect(screen.queryByText("Import starter exercises?")).not.toBeInTheDocument();
  expect(await appDb.exercises.count()).toBe(0);
});

test("asks before importing the starter catalog when no exercises are registered", async () => {
  renderWithLanguage(
    <DbInitProvider>
      <p>app content</p>
    </DbInitProvider>,
    { initialLanguage: "en" },
  );

  expect(await screen.findByText("Import starter exercises?")).toBeInTheDocument();
});

test("does not ask when exercises are already registered", async () => {
  await appDb.exercises.add(customExercise);

  renderWithLanguage(
    <DbInitProvider>
      <p>app content</p>
    </DbInitProvider>,
    { initialLanguage: "en" },
  );

  await waitFor(() => expect(screen.getByText("app content")).toBeInTheDocument());
  expect(screen.queryByText("Import starter exercises?")).not.toBeInTheDocument();
  expect(mockSyncIfNeeded).not.toHaveBeenCalled();
});

test("imports the starter catalog and reloads when the user confirms", async () => {
  const reload = vi.fn();
  vi.stubGlobal("location", { ...window.location, reload });
  const user = userEvent.setup();

  renderWithLanguage(
    <DbInitProvider>
      <p>app content</p>
    </DbInitProvider>,
    { initialLanguage: "en" },
  );

  await user.click(await screen.findByRole("button", { name: "Import" }));

  await waitFor(async () => expect(await appDb.exercises.count()).toBeGreaterThan(0));
  expect(reload).toHaveBeenCalledTimes(1);

  vi.unstubAllGlobals();
});

test("leaves the store empty when the user declines", async () => {
  const user = userEvent.setup();

  renderWithLanguage(
    <DbInitProvider>
      <p>app content</p>
    </DbInitProvider>,
    { initialLanguage: "en" },
  );

  await user.click(await screen.findByRole("button", { name: "Not now" }));

  expect(screen.queryByText("Import starter exercises?")).not.toBeInTheDocument();
  expect(await appDb.exercises.count()).toBe(0);
});

test("still seeds the self-care catalog silently regardless of the exercise dialog", async () => {
  renderWithLanguage(
    <DbInitProvider>
      <p>app content</p>
    </DbInitProvider>,
    { initialLanguage: "en" },
  );

  await waitFor(async () => expect(await appDb.selfCareCatalog.count()).toBeGreaterThan(0));
});
