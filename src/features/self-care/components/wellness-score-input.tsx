import { useTranslation } from "@/features/i18n/use-translation";
import type { WellnessScore } from "@/lib/types";

type WellnessScoreInputProps = {
  label: string;
  value: WellnessScore;
  onChange: (score: WellnessScore) => void;
};

const SCORES: WellnessScore[] = [1, 2, 3, 4, 5];

export function WellnessScoreInput({ label, value, onChange }: WellnessScoreInputProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div role="group" aria-label={label} className="wellness-score-input">
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            className={`wellness-score-input__button${value === score ? " is-selected" : ""}`}
            aria-pressed={value === score}
            onClick={() => onChange(score)}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="wellness-score-input__hint">
        <span>{t("wellness_score_hint_low")}</span>
        <span>{t("wellness_score_hint_high")}</span>
      </div>
    </div>
  );
}
