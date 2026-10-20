import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";
import { CelebrationProvider, useCelebrate } from "./celebration";
import { SaveButton } from "./save-button";
import { SAVED_FLASH_MS, useSavedFlash } from "./use-saved-flash";

function FlashHarness() {
  const { isSaved, flash } = useSavedFlash();
  return (
    <SaveButton isSaved={isSaved} onClick={flash}>
      保存
    </SaveButton>
  );
}

function CelebrateHarness({ result, seconds }: { result: "did" | "partial"; seconds: number }) {
  const celebrate = useCelebrate();
  return <button onClick={() => celebrate({ result, durationSeconds: seconds })}>go</button>;
}

describe("feedback primitives", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "vibrate");
  });

  it("shows saved label then reverts after SAVED_FLASH_MS", () => {
    renderWithLanguage(<FlashHarness />, { initialLanguage: "ja" });
    expect(SAVED_FLASH_MS).toBe(1500);
    fireEvent.click(screen.getByRole("button"));
    const btn = screen.getByRole("button", { name: "✓ 保存しました" });
    expect(btn.className).toContain("save-button--saved");
    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(screen.getByRole("button", { name: "✓ 保存しました" })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("button", { name: "保存" }).className).not.toContain("save-button--saved");
  });

  it("restarts the window when flash is called again", () => {
    renderWithLanguage(<FlashHarness />, { initialLanguage: "ja" });
    fireEvent.click(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole("button"));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: "✓ 保存しました" })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("button", { name: "保存" })).toBeTruthy();
  });

  it("celebrates a did result with duration and vibrates", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    renderWithLanguage(
      <CelebrationProvider>
        <CelebrateHarness result="did" seconds={330} />
      </CelebrationProvider>,
      { initialLanguage: "ja" },
    );
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByText("おつかれさま！ 5:30 やりました")).toBeTruthy();
    expect(screen.getByText("💮")).toBeTruthy();
    expect(vibrate).toHaveBeenCalledWith(80);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.queryByText("💮")).toBeNull();
  });

  it("does not throw without navigator.vibrate", () => {
    renderWithLanguage(
      <CelebrationProvider>
        <CelebrateHarness result="did" seconds={60} />
      </CelebrationProvider>,
      { initialLanguage: "ja" },
    );
    expect(() => fireEvent.click(screen.getByText("go"))).not.toThrow();
  });

  it("shows only the short message for partial", () => {
    renderWithLanguage(
      <CelebrationProvider>
        <CelebrateHarness result="partial" seconds={0} />
      </CelebrationProvider>,
      { initialLanguage: "ja" },
    );
    fireEvent.click(screen.getByText("go"));
    expect(screen.getByText("おつかれさま！")).toBeTruthy();
  });

  it("useCelebrate is a no-op outside the provider", () => {
    renderWithLanguage(<CelebrateHarness result="did" seconds={60} />, { initialLanguage: "ja" });
    expect(() => fireEvent.click(screen.getByText("go"))).not.toThrow();
    expect(screen.queryByText("💮")).toBeNull();
  });
});
