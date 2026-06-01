import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";
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
    <div className="space-y-2">
      <div role="group" aria-label={label} className="grid grid-cols-5 gap-2">
        {SCORES.map((score) => (
          <Button
            key={score}
            variant={value === score ? "default" : "outline"}
            size="icon"
            className={cn("h-12 w-full rounded-2xl", value === score && "shadow-sm shadow-primary/25")}
            aria-pressed={value === score}
            onClick={() => onChange(score)}
          >
            {score}
          </Button>
        ))}
      </div>
      <div className="flex justify-between px-1 text-xs text-muted-foreground">
        <span>{t("wellness_score_hint_low")}</span>
        <span>{t("wellness_score_hint_high")}</span>
      </div>
    </div>
  );
}
