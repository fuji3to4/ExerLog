import type { ChangeEvent } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ConditionLevel } from "@/lib/types";

type DailyConditionCardProps = {
  conditionLevel: ConditionLevel;
  note: string;
  onConditionLevelChange: (conditionLevel: ConditionLevel) => void;
  onNoteChange: (note: string) => void;
  onSave: () => void | Promise<void>;
};

export function DailyConditionCard({
  conditionLevel,
  note,
  onConditionLevelChange,
  onNoteChange,
  onSave,
}: DailyConditionCardProps) {
  const { t } = useTranslation();

  const conditionOptions: Array<{ label: string; value: ConditionLevel }> = [
    { label: t("condition_good"), value: "good" },
    { label: t("condition_okay"), value: "okay" },
    { label: t("condition_tired"), value: "tired" },
  ];

  return (
    <section className="card today-screen__section">
      <div className="today-screen__section-heading">
        <h2>{t("condition_heading")}</h2>
        <p>{t("condition_subheading")}</p>
      </div>

      <fieldset className="condition-card__options">
        <legend>{t("condition_legend")}</legend>
        {conditionOptions.map((option) => (
          <label key={option.value} className="condition-card__option">
            <input
              type="radio"
              name="daily-condition"
              value={option.value}
              checked={conditionLevel === option.value}
              onChange={() => onConditionLevelChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <label className="condition-card__note">
        <span>{t("condition_note_label")}</span>
        <textarea
          rows={4}
          value={note}
          placeholder={t("condition_note_placeholder")}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onNoteChange(event.target.value)}
        />
      </label>

      <button type="button" className="today-screen__primary-button" onClick={() => void onSave()}>
        {t("condition_save_button")}
      </button>
    </section>
  );
}
