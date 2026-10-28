"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { timeOfIso } from "@/lib/date/local-iso";
import { SummaryCardFrame, SummaryEmpty, usePeriodSummary } from "../components/summary-card";
import type { Period } from "../period";
import { photoData } from "./data";
import { PhotoStrip } from "./photo-strip";
import { summarizePhotos } from "./summary";

const EMPTY = { summary: null };

async function load(period: Period) {
  return { summary: summarizePhotos(await photoData.listInPeriod(period)) };
}

export function formatRecordedAt(iso: string): string {
  return `${iso.slice(5, 10).replace("-", "/")} ${timeOfIso(iso)}`;
}

export function PhotoSummaryCard({ period }: { period: Period }) {
  const { t } = useTranslation();
  const loaded = usePeriodSummary(period, load, EMPTY);
  const summary = loaded?.summary;

  return (
    <SummaryCardFrame title={t("module_photo_label")}>
      {loaded === undefined ? null : !summary ? (
        <SummaryEmpty />
      ) : (
        <>
          <p>{t("period_photo_summary", { count: summary.count, photos: summary.photoCount })}</p>
          {summary.records.map((record) => (
            <div key={record.id} className="space-y-1 pt-1">
              <p className="text-xs text-muted-foreground">{formatRecordedAt(record.recordedAt)}</p>
              <PhotoStrip record={record} thumbSize={56} />
            </div>
          ))}
        </>
      )}
    </SummaryCardFrame>
  );
}
