import { screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { appDb } from "./app-db";
import { DbInitProvider } from "./db-init-provider";

function renderProvider() {
  renderWithLanguage(
    <DbInitProvider>
      <p>app content</p>
    </DbInitProvider>,
    { initialLanguage: "en" },
  );
}

test("does not offer or import starter exercises when the library is empty", async () => {
  await appDb.exercises.clear();

  renderProvider();

  expect(await screen.findByText("app content")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(await appDb.exercises.count()).toBe(0);
});

test("asks the browser to persist storage on start and ignores a missing API or a rejection", async () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "storage");
  const setStorage = (value: unknown) =>
    Object.defineProperty(navigator, "storage", { value, configurable: true });
  try {
    const persist = vi.fn().mockResolvedValue(true);
    setStorage({ persist });
    renderProvider();
    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));

    const rejecting = vi.fn().mockRejectedValue(new Error("denied"));
    setStorage({ persist: rejecting });
    renderProvider();
    await waitFor(() => expect(rejecting).toHaveBeenCalledTimes(1));

    setStorage({});
    renderProvider();
    setStorage(undefined);
    renderProvider();
    expect((await screen.findAllByText("app content")).length).toBe(4);
  } finally {
    if (original) Object.defineProperty(navigator, "storage", original);
    else delete (navigator as unknown as Record<string, unknown>).storage;
  }
});
