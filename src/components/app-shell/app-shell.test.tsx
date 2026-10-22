import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./app-shell";
import { renderWithLanguage } from "@/test/render-with-language";
import { MockSyncProvider } from "@/test/mock-sync-provider";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
}));

function renderAppShell() {
  return renderWithLanguage(
    <MockSyncProvider>
      <AppShell currentPath="/library">
        <section>content</section>
      </AppShell>
    </MockSyncProvider>,
    { initialLanguage: "en" },
  );
}

test("renders shell layout with utility classes and accessible language radios", async () => {
  const user = userEvent.setup();
  const { container } = renderAppShell();

  expect(container.firstElementChild).not.toHaveClass("app-shell");
  expect(screen.getByRole("banner")).toHaveClass("sticky", "top-0");
  expect(screen.getByRole("banner")).not.toHaveClass("app-shell__header");
  const header = screen.getByRole("banner");
  expect(within(header).getByRole("heading", { name: "ExerLog" })).toHaveClass("text-lg", "font-semibold");
  expect(within(header).getByRole("heading", { name: "ExerLog" })).not.toHaveClass("app-shell__brand");
  expect(screen.getByRole("main")).toHaveClass("pb-28");
  expect(screen.getByRole("main")).not.toHaveClass("page-content");

  const languageGroup = within(header).getByRole("group", { name: /language/i });
  const japaneseRadio = within(header).getByRole("radio", { name: "日本語" });
  const englishRadio = within(header).getByRole("radio", { name: "English" });

  expect(languageGroup).toBeInTheDocument();
  expect(japaneseRadio).not.toBeChecked();
  expect(englishRadio).toBeChecked();

  await user.click(japaneseRadio);

  expect(japaneseRadio).toBeChecked();
  expect(englishRadio).not.toBeChecked();
  expect(screen.getByRole("navigation", { name: /メイン/i })).toHaveClass("fixed", "bottom-0");
});

test("desktop sidebar shows translated nav labels and no hardcoded Navigation", () => {
  const { container } = renderWithLanguage(
    <MockSyncProvider>
      <AppShell currentPath="/library">
        <section>content</section>
      </AppShell>
    </MockSyncProvider>,
    { initialLanguage: "ja" },
  );

  const sidebarLinks = Array.from(container.querySelectorAll("a[href]")).map((a) => a.textContent);
  expect(sidebarLinks).toEqual(expect.arrayContaining(["今日", "ライブラリ", "履歴", "設定"]));
  expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
  expect(screen.queryByText("Today")).not.toBeInTheDocument();
  expect(screen.queryByText("Self-care")).not.toBeInTheDocument();
  expect(sidebarLinks).not.toContain("コンディション");
});
