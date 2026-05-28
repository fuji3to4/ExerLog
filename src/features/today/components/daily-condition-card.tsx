import { useTranslation } from "@/features/i18n/use-translation";
import type { WellnessScore } from "@/lib/types";
import { WellnessScoreInput } from "@/features/self-care/components/wellness-score-input";

type DailyConditionCardProps = {
  physicalScore: WellnessScore;
  mentalScore: WellnessScore;
  note: string;
  onPhysicalScoreChange: (score: WellnessScore) => void;
  onMentalScoreChange: (score: WellnessScore) => void;
  onNoteChange: (note: string) => void;
  onSave: () => void | Promise<void>;
  saveError?: string;
};

export function DailyConditionCard({
  physicalScore,
  mentalScore,
  note,
  onPhysicalScoreChange,
  onMentalScoreChange,
  onNoteChange,
  onSave,
  saveError,
}: DailyConditionCardProps) {
  const { t } = useTranslation();

  return (
    <section className="card today-screen__section">
      <div className="today-screen__section-heading">
        <h2>{t("condition_heading")}</h2>
        <p>{t("condition_subheading")}</p>
      </div>

      <fieldset className="condition-card__options">
        <legend>{t("condition_legend")}</legend>
        <div className="condition-card__option">
          <span>{t("self_care_physical_label")}</span>
          <WellnessScoreInput
            label={t("self_care_physical_label")}
            value={physicalScore}
            onChange={onPhysicalScoreChange}
          />
        </div>
        <div className="condition-card__option">
          <span>{t("self_care_mental_label")}</span>
          <WellnessScoreInput
            label={t("self_care_mental_label")}
            value={mentalScore}
            onChange={onMentalScoreChange}
          />
        </div>
      </fieldset>

      <label className="condition-card__note">
        <span>{t("condition_note_label")}</span>
        <textarea
          rows={4}
          value={note}
          placeholder={t("condition_note_placeholder")}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </label>

      <button type="button" className="today-screen__primary-button" onClick={() => void onSave()}>
        {t("condition_save_button")}
      </button>
      {saveError && <p role="alert" className="condition-card__error">{saveError}</p>}
    </section>
  );
}
