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
  const { language } = useTranslation();
  const copy =
    language === "ja"
      ? {
          heading: "ウェルネス",
          text: "今日の体と心の状態を記録しましょう。",
          physicalScoreLabel: "身体スコア",
          mentalScoreLabel: "心のスコア",
        }
      : {
          heading: "Wellness",
          text: "Rate how your body and mind feel today.",
          physicalScoreLabel: "Physical score",
          mentalScoreLabel: "Mental score",
        };

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
        <h2>{copy.heading}</h2>
        <p>{copy.text}</p>
      </div>

      <label className="self-care-screen__field">
        <span>{copy.physicalScoreLabel}</span>
        <input
          type="number"
          min={1}
          max={5}
          value={physicalScore}
          onChange={(event) => handleScoreChange(event, onPhysicalScoreChange)}
        />
      </label>

      <label className="self-care-screen__field">
        <span>{copy.mentalScoreLabel}</span>
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
