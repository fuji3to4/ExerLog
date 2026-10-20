import type { ChangeEvent } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/features/i18n/use-translation";
import type { MetricType } from "@/lib/types";

type MetricsCardProps = {
  metrics: Record<MetricType, string>;
  bmi: number | null;
  onMetricChange: (metricType: MetricType, value: string) => void;
};

type MetricField = {
  metricType: MetricType;
  unit: string;
  labelKey: "self_care_metric_height" | "self_care_metric_weight" | "self_care_metric_body_fat";
};

export function MetricsCard({ metrics, bmi, onMetricChange }: MetricsCardProps) {
  const { t } = useTranslation();
  const headingId = "self-care-metrics-heading";
  const fields = [
    { metricType: "height", unit: "cm", labelKey: "self_care_metric_height" },
    { metricType: "weight", unit: "kg", labelKey: "self_care_metric_weight" },
    { metricType: "bodyFat", unit: "%", labelKey: "self_care_metric_body_fat" },
  ] satisfies MetricField[];
  const hasWeight = Number(metrics.weight) > 0;

  return (
    <Card role="region" aria-labelledby={headingId} className="grid gap-4">
      <CardHeader className="gap-2">
        <h2 id={headingId} className="text-xl font-semibold">
          {t("self_care_metrics_heading")}
        </h2>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3">
          {fields.map((field) => (
            <div key={field.metricType} className="grid content-start gap-2">
              <label className="grid gap-2 font-semibold">
                <span className="text-sm text-muted-foreground">{t(field.labelKey)}</span>
                <div className="flex items-center overflow-hidden rounded-2xl border border-input bg-popover">
                  <Input
                    type="number"
                    inputMode="decimal"
                    className="rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={metrics[field.metricType]}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onMetricChange(field.metricType, event.target.value)
                    }
                  />
                  <span className="px-3 text-sm font-medium text-muted-foreground">{field.unit}</span>
                </div>
              </label>
              {field.metricType === "weight" && hasWeight ? (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {bmi !== null ? t("bmi_value", { value: bmi.toFixed(1) }) : t("bmi_need_height")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
