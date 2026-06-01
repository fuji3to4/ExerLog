"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
  const {
    isHydrated,
    physicalScore,
    mentalScore,
    note,
    metrics,
    setPhysicalScore,
    setMentalScore,
    setNote,
    setMetric,
    save,
  } = useSelfCareData(date);
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
          <WellnessCard
            physicalScore={physicalScore}
            mentalScore={mentalScore}
            note={note}
            onPhysicalScoreChange={setPhysicalScore}
            onMentalScoreChange={setMentalScore}
            onNoteChange={setNote}
          />

          <MetricsCard metrics={metrics} onMetricChange={setMetric} />

          <Card className="grid gap-4">
            <CardContent className="pt-0">
              <div className="button-row">
                <Button className="w-full sm:w-auto" onClick={() => void save()}>
                  {t("self_care_save_button")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
