"use client";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SaveButton } from "@/features/feedback/save-button";
import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";

import { MetricsCard } from "./metrics-card";
import { WellnessCard } from "./wellness-card";
import { useSelfCareData } from "../use-self-care-data";

type SelfCareScreenProps = {
  date?: string;
};

export function SelfCareScreen({ date: dateProp }: SelfCareScreenProps) {
  const date = dateProp ?? toDayKey(new Date());
  const { t, formatDate } = useTranslation();
  const { dayKey, isHydrated, metrics, bmi, setMetric, save, isSaved, hasSaveError } = useSelfCareData(date);

  return (
    <>
      <Card className="page-header">
        <CardHeader className="gap-2">
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t("self_care_heading")}</h1>
          <CardDescription>{t("self_care_subheading")}</CardDescription>
        </CardHeader>
      </Card>

      {!isHydrated ? (
        <Card className="grid gap-4" aria-live="polite">
          <CardHeader>
            <h2 className="text-xl font-semibold">{t("today_loading_heading")}</h2>
            <CardDescription>{t("today_loading_text")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-center">
            <div className="lg:max-w-[400px] lg:w-full">
              <WellnessCard date={dayKey} />
            </div>
            <div className="lg:max-w-[400px] lg:w-full">
              <MetricsCard metrics={metrics} bmi={bmi} onMetricChange={setMetric} />
            </div>
          </div>

          <Card className="grid gap-4">
            <CardContent className="grid gap-3 pt-0">
              {hasSaveError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {t("self_care_save_error")}
                </p>
              ) : null}
              <div className="button-row">
                <SaveButton className="w-full sm:w-auto" isSaved={isSaved} onClick={() => void save()}>
                  {t("self_care_save_button")}
                </SaveButton>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
