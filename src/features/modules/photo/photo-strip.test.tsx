import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./use-photo-url", () => ({
  usePhotoUrl: (photoId: string) => ({ status: "ready", url: `blob:${photoId}` }),
}));

import type { PhotoRecord } from "@/lib/types";
import { renderWithLanguage } from "@/test/render-with-language";
import { PhotoStrip } from "./photo-strip";
import { PhotoViewer } from "./photo-viewer";

const record: PhotoRecord = {
  id: "r1",
  date: "2026-10-20",
  recordedAt: "2026-10-20T08:00:00+09:00",
  note: "",
  photoIds: ["a", "b", "c", "d", "e", "f"],
  updatedAt: "2026-10-20T08:00:00+09:00",
};

describe("PhotoStrip", () => {
  it("shows +n beyond maxThumbs and opens the viewer at the clicked photo", () => {
    renderWithLanguage(<PhotoStrip record={record} maxThumbs={4} />, { initialLanguage: "ja" });
    expect(screen.getAllByRole("button", { name: /^写真 \d \/ 6$/ })).toHaveLength(4);
    expect(screen.getByText("+2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "写真 2 / 6" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("2 / 6")).toBeTruthy();
  });
});

describe("PhotoViewer", () => {
  it("moves with next/prev and arrow keys and shows 2 / 3", () => {
    const three = { ...record, photoIds: ["a", "b", "c"] };
    renderWithLanguage(<PhotoViewer record={three} startIndex={1} open onOpenChange={vi.fn()} />, {
      initialLanguage: "ja",
    });
    expect(screen.getByText("2 / 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "次の写真" }));
    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "次の写真" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByText("2 / 3")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByText("1 / 3")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "前の写真" }));
    expect(screen.getByText("1 / 3")).toBeTruthy();
  });
});
