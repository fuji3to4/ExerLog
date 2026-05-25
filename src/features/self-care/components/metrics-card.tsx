import type { ChangeEvent } from "react";

import type { MetricType } from "@/lib/types";

type MetricsCardProps = {
  metrics: Record<MetricType, string>;
  onMetricChange: (metricType: MetricType, value: string) => void;
};

type MetricField = {
  metricType: MetricType;
  unit: string;
};

export function MetricsCard({ metrics, onMetricChange }: MetricsCardProps) {
  const fields = [
    { metricType: "height", unit: "cm" },
    { metricType: "weight", unit: "kg" },
    { metricType: "bodyFat", unit: "%" },
  ] satisfies MetricField[];

  return (
    <section className="card self-care-screen__section">
      <div className="self-care-screen__metrics-grid">
        {fields.map((field) => (
          <label key={field.metricType} className="self-care-screen__field">
            <span>{field.unit}</span>
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
