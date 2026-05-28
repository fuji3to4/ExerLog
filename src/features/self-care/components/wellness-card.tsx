import { useTranslation } from "@/features/i18n/use-translation";
import type { WellnessScore } from "@/lib/types";

import { WellnessScoreInput } from "./wellness-score-input";

type WellnessCardProps = {
  physicalScore: WellnessScore;
  mentalScore: WellnessScore;
  note: string;
  onPhysicalScoreChange: (value: WellnessScore) => void;
  onMentalScoreChange: (value: WellnessScore) => void;
  onNoteChange: (value: string) => void;
};

export function WellnessCard({
  physicalScore,
  mentalScore,
  note,
  onPhysicalScoreChange,
  onMentalScoreChange,
  onNoteChange,
}: WellnessCardProps) {
  const { t } = useTranslation();

  return (
    <section className="card self-care-screen__section">
      <div className="self-care-screen__section-heading">
        <h2>{t("history_condition_heading")}</h2>
      </div>

      <div className="self-care-screen__field">
        <span>{t("self_care_physical_label")}</span>
        <WellnessScoreInput
          label={t("self_care_physical_label")}
          value={physicalScore}
          onChange={onPhysicalScoreChange}
        />
      </div>

      <div className="self-care-screen__field">
        <span>{t("self_care_mental_label")}</span>
        <WellnessScoreInput
          label={t("self_care_mental_label")}
          value={mentalScore}
          onChange={onMentalScoreChange}
        />
      </div>

      <label className="self-care-screen__field">
        <span>{t("condition_note_label")}</span>
        <textarea
          rows={3}
          value={note}
          placeholder={t("condition_note_placeholder")}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </label>
    </section>
  );
}
