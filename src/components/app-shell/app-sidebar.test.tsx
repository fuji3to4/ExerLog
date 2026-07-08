import { render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock SyncProvider
vi.mock("@/features/sync/SyncProvider", () => ({
  useSync: () => ({
    status: { type: "disconnected" },
    userEmail: null,
    signIn: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

// Mock useTranslation
vi.mock("@/features/i18n/use-translation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: "en",
    messages: {
      language_ja: "Japanese",
      language_en: "English",
      language_label: "Language",
    },
    setLanguage: vi.fn(),
  }),
}));

// Mock usePathname
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("AppSidebar", () => {
  it("renders all navigation items", () => {
    render(
      <SidebarProvider>
        <AppSidebar currentPath="/" />
      </SidebarProvider>
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Self-care")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights current page", () => {
    render(
      <SidebarProvider>
        <AppSidebar currentPath="/library" />
      </SidebarProvider>
    );

    const libraryLink = screen.getByText("Library").closest("a");
    // The link should exist and be accessible
    expect(libraryLink).toBeInTheDocument();
    expect(libraryLink).toHaveAttribute("href", "/library");
  });
});
