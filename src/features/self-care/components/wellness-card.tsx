import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  const headingId = "self-care-wellness-heading";

  return (
    <Card role="region" aria-labelledby={headingId} className="self-care-screen__section">
      <CardHeader className="self-care-screen__section-heading">
        <h2 id={headingId} className="text-xl font-semibold">
          {t("history_condition_heading")}
        </h2>
      </CardHeader>

      <CardContent className="space-y-4">
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
          <Textarea
            rows={3}
            value={note}
            placeholder={t("condition_note_placeholder")}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </label>
      </CardContent>
    </Card>
  );
}
