"use client";

import { Camera } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeLabelTag } from "@/features/timeline/components/time-label-tag";
import type { PhotoRecord } from "@/lib/types";
import type { RecordModule, TimeLabel } from "../types";
import { photoData } from "./data";
import { PhotoForm } from "./photo-form";

function PhotoTimelineCard({ record, label }: { record: PhotoRecord; label: TimeLabel | null }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="block">
        {"📷 "}
        {t("photo_count", { count: record.photoIds.length })}
        <TimeLabelTag label={label} />
      </span>
      {record.note ? <span className="block text-muted-foreground">{record.note}</span> : null}
    </>
  );
}

// Task 4 replaces these placeholders.
function PhotoHistoryView() {
  return null;
}

function PhotoSummaryCard() {
  return null;
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
