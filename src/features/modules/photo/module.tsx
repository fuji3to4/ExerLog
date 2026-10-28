"use client";

import { Camera } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { PhotoRecord } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { photoData } from "./data";
import { PhotoForm } from "./photo-form";
import { PhotoStrip } from "./photo-strip";
import { listAllPhotoRecords } from "./repository";
import { formatRecordedAt, PhotoSummaryCard } from "./summary-card";

/** "1 photo" / "n photos" (ja: n枚). */
function photoCountMessage(count: number) {
  return [count === 1 ? "photo_count_one" : "photo_count", { count }] as const;
}

function PhotoTimelineCard({ record, label }: { record: PhotoRecord; label: TimeLabel | null }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="block">
        {"📷 "}
        {t(...photoCountMessage(record.photoIds.length))}
        <TimeLabelTag label={label} />
      </span>
      <PhotoStrip record={record} thumbSize={48} maxThumbs={4} interactive={false} />
      {record.note ? <span className="block text-muted-foreground">{record.note}</span> : null}
    </>
  );
}

function PhotoHistoryView() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<PhotoRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAllPhotoRecords()
      .catch((error: unknown) => {
        console.error("Failed to load photo records", error);
        return [] as PhotoRecord[];
      })
      .then((all) => {
        if (!cancelled) setRecords(all.reverse());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (records === null) return null;
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("photo_history_empty")}</p>;
  }
  return (
    <ul className="space-y-2">
      {records.map((record) => (
        <li key={record.id} className="space-y-1.5 rounded-xl border border-border p-2 text-sm">
          <p className="text-xs text-muted-foreground">
            {formatRecordedAt(record.recordedAt)}
            {"・"}
            {t(...photoCountMessage(record.photoIds.length))}
          </p>
          <PhotoStrip record={record} thumbSize={72} />
          {record.note ? <p>{record.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export const photoModule: RecordModule<PhotoRecord> = {
  data: photoData,
  labelKey: "module_photo_label",
  descriptionKey: "module_photo_description",
  editTitleKey: "photo_edit_title",
  icon: Camera,
  color: "#3b8ea5",
  Form: PhotoForm,
  TimelineCard: PhotoTimelineCard,
  HistoryView: PhotoHistoryView,
  SummaryCard: PhotoSummaryCard,
};
