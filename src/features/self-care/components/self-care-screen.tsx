"use client";

import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";

import { RecordCard } from "./record-card";

type SelfCareScreenProps = {
  date?: string;
};

export function SelfCareScreen({ date: dateProp }: SelfCareScreenProps) {
  const date = dateProp ?? toDayKey(new Date());
  const { t, formatDate } = useTranslation();

  return (
    <>
      <Card className="page-header">
        <CardHeader className="gap-2">
          <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{t("self_care_heading")}</h1>
          <CardDescription>{t("self_care_subheading")}</CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-4 lg:flex-row lg:justify-center">
        <div className="lg:max-w-[400px] lg:w-full">
          <RecordCard date={toDayKey(date)} />
        </div>
      </div>
    </>
  );
}
