import type { ChangeEvent } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/features/i18n/use-translation";
import type { MetricType } from "@/lib/types";

type MetricsCardProps = {
  metrics: Record<MetricType, string>;
  onMetricChange: (metricType: MetricType, value: string) => void;
};

type MetricField = {
  metricType: MetricType;
  unit: string;
  labelKey: "self_care_metric_height" | "self_care_metric_weight" | "self_care_metric_body_fat";
};

export function MetricsCard({ metrics, onMetricChange }: MetricsCardProps) {
  const { t } = useTranslation();
  const headingId = "self-care-metrics-heading";
  const fields = [
    { metricType: "height", unit: "cm", labelKey: "self_care_metric_height" },
    { metricType: "weight", unit: "kg", labelKey: "self_care_metric_weight" },
    { metricType: "bodyFat", unit: "%", labelKey: "self_care_metric_body_fat" },
  ] satisfies MetricField[];

  return (
    <Card role="region" aria-labelledby={headingId} className="self-care-screen__section">
      <CardHeader className="self-care-screen__section-heading">
        <h2 id={headingId} className="text-xl font-semibold">
          {t("self_care_metrics_heading")}
        </h2>
      </CardHeader>
      <CardContent>
        <div className="self-care-screen__metrics-grid">
          {fields.map((field) => (
            <label key={field.metricType} className="self-care-screen__field">
              <span>{t(field.labelKey)}</span>
              <div className="self-care-screen__metric-input">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={metrics[field.metricType]}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    onMetricChange(field.metricType, event.target.value)
                  }
                />
                <span>{field.unit}</span>
              </div>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
