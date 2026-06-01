import { afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import "@testing-library/jest-dom";

// Mock next/font/google to provide a minimal Sofia_Sans implementation during tests
// so layout imports that call Sofia_Sans("...") won't throw in jsdom.
vi.mock("next/font/google", () => ({
  Sofia_Sans: (options?: { variable?: string }) => ({ variable: options?.variable ?? "--font-sans" }),
}));

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = "";
  delete document.documentElement.dataset.language;
});
