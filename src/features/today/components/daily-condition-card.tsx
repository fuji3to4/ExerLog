import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  const headingId = "today-daily-condition-heading";

  return (
    <Card role="region" aria-labelledby={headingId} className="today-screen__section">
      <CardHeader className="today-screen__section-heading">
        <h2 id={headingId} className="text-xl font-semibold">
          {t("condition_heading")}
        </h2>
        <CardDescription>{t("condition_subheading")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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
          <Textarea
            rows={4}
            value={note}
            placeholder={t("condition_note_placeholder")}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </label>

        <Button className="w-full sm:w-auto" onClick={() => void onSave()}>
          {t("condition_save_button")}
        </Button>
        {saveError ? (
          <p role="alert" className="condition-card__error text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
