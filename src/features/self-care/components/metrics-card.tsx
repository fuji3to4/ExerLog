import type { ChangeEvent } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { MetricType } from "@/lib/types";

type MetricsCardProps = {
  metrics: Record<MetricType, string>;
  onMetricChange: (metricType: MetricType, value: string) => void;
};

type MetricField = {
  metricType: MetricType;
  label: string;
  unit: string;
};

export function MetricsCard({ metrics, onMetricChange }: MetricsCardProps) {
  const { t } = useTranslation();
  const fields = [
    { metricType: "height", label: t("self_care_metric_height"), unit: "cm" },
    { metricType: "weight", label: t("self_care_metric_weight"), unit: "kg" },
    { metricType: "bodyFat", label: t("self_care_metric_body_fat"), unit: "%" },
  ] satisfies MetricField[];

  return (
    <section className="card self-care-screen__section">
      <div className="self-care-screen__section-heading">
        <h2>{t("self_care_metrics_heading")}</h2>
        <p>{t("self_care_metrics_description")}</p>
      </div>

      <div className="self-care-screen__metrics-grid">
        {fields.map((field) => (
          <label key={field.metricType} className="self-care-screen__field">
            <span>{field.label}</span>
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
