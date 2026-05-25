import type { ChangeEvent } from "react";

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
  const fields = [
    { metricType: "height", unit: "cm", labelKey: "self_care_metric_height" },
    { metricType: "weight", unit: "kg", labelKey: "self_care_metric_weight" },
    { metricType: "bodyFat", unit: "%", labelKey: "self_care_metric_body_fat" },
  ] satisfies MetricField[];

  return (
    <section className="card self-care-screen__section">
      <div className="self-care-screen__metrics-grid">
        {fields.map((field) => (
          <label key={field.metricType} className="self-care-screen__field">
            <span>{t(field.labelKey)}</span>
            <div className="self-care-screen__metric-input">
              <input
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
    </section>
  );
}
