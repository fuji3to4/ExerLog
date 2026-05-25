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
  const { language } = useTranslation();
  const copy =
    language === "ja"
      ? {
          heading: "身体指標",
          text: "この日に残したい測定値を保存しましょう。",
          fields: [
            { metricType: "height", label: "身長", unit: "cm" },
            { metricType: "weight", label: "体重", unit: "kg" },
            { metricType: "bodyFat", label: "体脂肪率", unit: "%" },
          ] satisfies MetricField[],
        }
      : {
          heading: "Body metrics",
          text: "Save any measurements you want to keep for the day.",
          fields: [
            { metricType: "height", label: "Height", unit: "cm" },
            { metricType: "weight", label: "Weight", unit: "kg" },
            { metricType: "bodyFat", label: "Body fat", unit: "%" },
          ] satisfies MetricField[],
        };

  return (
    <section className="card self-care-screen__section">
      <div className="self-care-screen__section-heading">
        <h2>{copy.heading}</h2>
        <p>{copy.text}</p>
      </div>

      <div className="self-care-screen__metrics-grid">
        {copy.fields.map((field) => (
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
