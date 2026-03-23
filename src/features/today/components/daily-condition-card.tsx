import type { ChangeEvent } from "react";

import type { ConditionLevel } from "@/lib/types";

const conditionOptions: Array<{ label: string; value: ConditionLevel }> = [
  { label: "Feeling good", value: "good" },
  { label: "Okay", value: "okay" },
  { label: "Tired", value: "tired" },
];

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
  return (
    <section className="card today-screen__section">
      <div className="today-screen__section-heading">
        <h2>Daily condition</h2>
        <p>Pick how you feel today, add a quick note, then save it for today&apos;s plan.</p>
      </div>

      <fieldset className="condition-card__options">
        <legend>How are you feeling?</legend>
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
        <span>Note</span>
        <textarea
          rows={4}
          value={note}
          placeholder="Add anything worth remembering for today."
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onNoteChange(event.target.value)}
        />
      </label>

      <button type="button" className="today-screen__primary-button" onClick={() => void onSave()}>
        Save condition
      </button>
    </section>
  );
}
