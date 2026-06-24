import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./app-shell";
import { renderWithLanguage } from "@/test/render-with-language";
import { SyncContext } from "@/features/sync/SyncProvider";

function mockSyncContext() {
  return {
    status: { type: "disconnected" as const },
    signIn: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    syncNow: () => Promise.resolve(),
    userEmail: null,
  };
}

function renderAppShell() {
  return renderWithLanguage(
    <SyncContext.Provider value={mockSyncContext()}>
      <AppShell currentPath="/library">
        <section>content</section>
      </AppShell>
    </SyncContext.Provider>,
    { initialLanguage: "en" },
  );
}

test("renders shell layout with utility classes and accessible language radios", async () => {
  const user = userEvent.setup();
  const { container } = renderAppShell();

  expect(container.firstElementChild).not.toHaveClass("app-shell");
  expect(screen.getByRole("banner")).toHaveClass("sticky", "top-0");
  expect(screen.getByRole("banner")).not.toHaveClass("app-shell__header");
  expect(screen.getByRole("heading", { name: "ExerLog" })).toHaveClass("text-lg", "font-semibold");
  expect(screen.getByRole("heading", { name: "ExerLog" })).not.toHaveClass("app-shell__brand");
  expect(screen.getByRole("main")).toHaveClass("pb-28");
  expect(screen.getByRole("main")).not.toHaveClass("page-content");

  const languageGroup = screen.getByRole("group", { name: /language/i });
  const japaneseRadio = screen.getByRole("radio", { name: "日本語" });
  const englishRadio = screen.getByRole("radio", { name: "English" });

  expect(languageGroup).toBeInTheDocument();
  expect(japaneseRadio).not.toBeChecked();
  expect(englishRadio).toBeChecked();

  await user.click(japaneseRadio);

  expect(japaneseRadio).toBeChecked();
  expect(englishRadio).not.toBeChecked();
  expect(screen.getByRole("navigation", { name: /メイン/i })).toHaveClass("fixed", "bottom-0");
});
