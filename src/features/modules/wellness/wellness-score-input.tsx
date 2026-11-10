import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { WellnessScore } from "@/lib/types";

type WellnessScoreInputProps<T extends number = WellnessScore> = {
  label: string;
  /** null shows nothing selected (a custom scale that is still empty). */
  value: T | null;
  onChange: (score: T) => void;
  /** Number of steps, 1..levels. Defaults to 5. */
  levels?: number;
  /** End captions; default to the wellness hints. */
  lowLabel?: string;
  highLabel?: string;
};

export function WellnessScoreInput<T extends number = WellnessScore>({
  label,
  value,
  onChange,
  levels = 5,
  lowLabel,
  highLabel,
}: WellnessScoreInputProps<T>) {
  const { t } = useTranslation();
  const scores = Array.from({ length: levels }, (_, i) => (i + 1) as T);

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={label}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${levels}, minmax(0, 1fr))` }}
      >
        {scores.map((score) => (
          <Button
            key={score}
            variant={value === score ? "default" : "outline"}
            className={cn("w-full", levels !== 5 && "px-0", value === score && "border border-[var(--tonal-border)]")}
            aria-pressed={value === score}
            onClick={() => onChange(score)}
          >
            {score}
          </Button>
        ))}
      </div>
      <div className="flex justify-between px-1 text-xs text-muted-foreground">
        <span>{lowLabel ?? t("wellness_score_hint_low")}</span>
        <span>{highLabel ?? t("wellness_score_hint_high")}</span>
      </div>
    </div>
  );
}
