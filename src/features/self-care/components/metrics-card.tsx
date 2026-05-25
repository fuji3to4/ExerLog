import type { ChangeEvent } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { MetricType } from "@/lib/types";

type MetricsCardProps = {
  metrics: Record<MetricType, string>;
  onMetricChange: (metricType: MetricType, value: string) => void;
};

type MetricField = {
  metricType: MetricType;
  labelKey: "self_care_height_label" | "self_care_weight_label" | "self_care_body_fat_label";
  unitKey: "self_care_height_unit" | "self_care_weight_unit" | "self_care_body_fat_unit";
};

const metricFields: MetricField[] = [
  { metricType: "height", labelKey: "self_care_height_label", unitKey: "self_care_height_unit" },
  { metricType: "weight", labelKey: "self_care_weight_label", unitKey: "self_care_weight_unit" },
  { metricType: "bodyFat", labelKey: "self_care_body_fat_label", unitKey: "self_care_body_fat_unit" },
];

export function MetricsCard({ metrics, onMetricChange }: MetricsCardProps) {
  const { t } = useTranslation();

  return (
    <section className="card self-care-screen__section">
      <div className="self-care-screen__section-heading">
        <h2>{t("self_care_metrics_heading")}</h2>
        <p>{t("self_care_metrics_text")}</p>
      </div>

      <div className="self-care-screen__metrics-grid">
        {metricFields.map((field) => (
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
              <span>{t(field.unitKey)}</span>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
