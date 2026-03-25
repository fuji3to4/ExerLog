"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { addExercise, updateExercise } from "@/features/storage/exercise-catalog.repository";
import type { ExerciseIntensity, ExerciseVideo } from "@/lib/types";

type ExerciseFormModalProps = {
  exercise: ExerciseVideo | null;
  onSaved: () => void;
  onCancel: () => void;
};

const BODY_AREAS = ["upper-body", "lower-body", "full-body"] as const;
const PURPOSES = ["warmup", "mobility", "strength", "recovery", "endurance"] as const;
const INTENSITIES: ExerciseIntensity[] = ["low", "medium", "high"];

type FormState = {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  bodyArea: string;
  purpose: string;
  durationMinutes: string;
  intensity: ExerciseIntensity;
};

export function ExerciseFormModal({ exercise, onSaved, onCancel }: ExerciseFormModalProps) {
  const { t, formatBodyArea, formatPurpose, formatIntensity } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>({
    title: exercise?.title ?? "",
    description: exercise?.description ?? "",
    videoUrl: exercise?.videoUrl ?? "",
    thumbnailUrl: exercise?.thumbnailUrl ?? "",
    bodyArea: exercise?.bodyArea ?? "upper-body",
    purpose: exercise?.purpose ?? "warmup",
    durationMinutes: exercise?.durationMinutes?.toString() ?? "",
    intensity: exercise?.intensity ?? "low",
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: ExerciseVideo = {
      id: exercise?.id ?? crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      videoUrl: form.videoUrl.trim(),
      thumbnailUrl: form.thumbnailUrl.trim(),
      bodyArea: form.bodyArea,
      purpose: form.purpose,
      durationMinutes: Number(form.durationMinutes),
      intensity: form.intensity,
    };

    if (exercise) {
      await updateExercise(data);
    } else {
      await addExercise(data);
    }
    onSaved();
  }

  return (
    <dialog ref={dialogRef} className="modal" onCancel={onCancel}>
      <div className="modal__content">
        <h2>{exercise ? t("settings_form_edit_heading") : t("settings_form_add_heading")}</h2>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="modal__field">
            <label htmlFor="ex-title">{t("settings_form_title_label")}</label>
            <input
              id="ex-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label htmlFor="ex-description">{t("settings_form_description_label")}</label>
            <textarea
              id="ex-description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label htmlFor="ex-video-url">{t("settings_form_video_url_label")}</label>
            <input
              id="ex-video-url"
              type="url"
              required
              value={form.videoUrl}
              onChange={(e) => handleChange("videoUrl", e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label htmlFor="ex-thumbnail-url">{t("settings_form_thumbnail_url_label")}</label>
            <input
              id="ex-thumbnail-url"
              type="url"
              value={form.thumbnailUrl}
              onChange={(e) => handleChange("thumbnailUrl", e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label htmlFor="ex-body-area">{t("settings_form_body_area_label")}</label>
            <select id="ex-body-area" value={form.bodyArea} onChange={(e) => handleChange("bodyArea", e.target.value)}>
              {BODY_AREAS.map((area) => (
                <option key={area} value={area}>
                  {formatBodyArea(area)}
                </option>
              ))}
            </select>
          </div>

          <div className="modal__field">
            <label htmlFor="ex-purpose">{t("settings_form_purpose_label")}</label>
            <select id="ex-purpose" value={form.purpose} onChange={(e) => handleChange("purpose", e.target.value)}>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {formatPurpose(p)}
                </option>
              ))}
            </select>
          </div>

          <div className="modal__field">
            <label htmlFor="ex-duration">{t("settings_form_duration_label")}</label>
            <input
              id="ex-duration"
              type="number"
              required
              min="1"
              max="120"
              value={form.durationMinutes}
              onChange={(e) => handleChange("durationMinutes", e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label htmlFor="ex-intensity">{t("settings_form_intensity_label")}</label>
            <select
              id="ex-intensity"
              value={form.intensity}
              onChange={(e) => handleChange("intensity", e.target.value as ExerciseIntensity)}
            >
              {INTENSITIES.map((i) => (
                <option key={i} value={i}>
                  {formatIntensity(i)}
                </option>
              ))}
            </select>
          </div>

          <div className="modal__actions">
            <button
              type="button"
              className="settings-action-button settings-action-button--secondary"
              onClick={onCancel}
            >
              {t("settings_form_cancel")}
            </button>
            <button type="submit" className="settings-action-button">
              {t("settings_form_save")}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
