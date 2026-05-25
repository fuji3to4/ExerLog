import type { ChangeEvent } from "react";

import { useTranslation } from "@/features/i18n/use-translation";

type WellnessCardProps = {
  physicalScore: number;
  mentalScore: number;
  onPhysicalScoreChange: (value: number) => void;
  onMentalScoreChange: (value: number) => void;
};

export function WellnessCard({
  physicalScore,
  mentalScore,
  onPhysicalScoreChange,
  onMentalScoreChange,
}: WellnessCardProps) {
  const { t } = useTranslation();

  function handleScoreChange(
    event: ChangeEvent<HTMLInputElement>,
    onChange: (value: number) => void,
  ) {
    const nextValue = Number(event.target.value);
    onChange(Number.isFinite(nextValue) ? nextValue : 1);
  }

  return (
  <section className="card self-care-screen__section">
    <div className="self-care-screen__section-heading">
      <h2>{t("history_condition_heading")}</h2>
    </div>

    <label className="self-care-screen__field">
      <span>{t("condition_heading")}</span>
      <input
        type="number"
        min={1}
          max={5}
          value={physicalScore}
          onChange={(event) => handleScoreChange(event, onPhysicalScoreChange)}
        />
      </label>

      <label className="self-care-screen__field">
        <span>{t("meta_intensity")}</span>
        <input
          type="number"
          min={1}
          max={5}
          value={mentalScore}
          onChange={(event) => handleScoreChange(event, onMentalScoreChange)}
        />
      </label>
    </section>
  );
}
