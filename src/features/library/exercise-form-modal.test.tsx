import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { renderWithLanguage } from "@/test/render-with-language";

import { ExerciseFormModal } from "./components/exercise-form-modal";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

test("shows a derived thumbnail preview when the video URL is a YouTube link and the field is blank", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/video url/i), "https://youtu.be/dQw4w9WgXcQ");

  expect(screen.getByLabelText(/thumbnail/i)).toHaveValue("");
  expect(screen.getByRole("img", { name: /thumbnail preview/i })).toHaveAttribute(
    "src",
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
});

test("keeps a manual thumbnail and shows that image instead of the derived preview", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/thumbnail/i), "https://cdn.example.com/manual.jpg");
  await user.type(screen.getByLabelText(/video url/i), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  expect(screen.getByLabelText(/thumbnail/i)).toHaveValue("https://cdn.example.com/manual.jpg");
  expect(screen.getByRole("img", { name: /thumbnail preview/i })).toHaveAttribute(
    "src",
    "https://cdn.example.com/manual.jpg",
  );
});

test("shows no preview for a non-YouTube URL when the thumbnail field is blank", async () => {
  const user = userEvent.setup();

  renderWithLanguage(<ExerciseFormModal exercise={null} onSaved={vi.fn()} onCancel={vi.fn()} />, {
    initialLanguage: "en",
  });

  await user.type(screen.getByLabelText(/video url/i), "https://example.com/video.mp4");

  expect(screen.queryByRole("img", { name: /thumbnail preview/i })).not.toBeInTheDocument();
});
