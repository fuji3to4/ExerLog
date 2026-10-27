"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import type { WellnessLabel } from "../build-timeline";

const LABEL_KEYS = {
  morning: "timeline_label_morning",
  beforeVideo: "timeline_label_before_video",
  afterVideo: "timeline_label_after_video",
  night: "timeline_label_night",
} as const satisfies Record<WellnessLabel, string>;

/** The 朝 / 動画の前 / 動画の後 / 夜 tag of a timeline row; nothing when there is no label. */
export function TimeLabelTag({ label }: { label: WellnessLabel | null }) {
  const { t } = useTranslation();
  return label ? <span className="timeline-tag">{t(LABEL_KEYS[label])}</span> : null;
}
