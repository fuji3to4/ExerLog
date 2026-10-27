"use client";

import { useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { PhotoRecord } from "@/lib/types";
import { PhotoThumb } from "./photo-thumb";
import { PhotoViewer } from "./photo-viewer";

/** A record's photos in one row (scrolls sideways when it overflows); a click opens the viewer there. */
export function PhotoStrip({
  record,
  thumbSize = 56,
  maxThumbs,
  interactive = true,
}: {
  record: PhotoRecord;
  thumbSize?: number;
  maxThumbs?: number;
  /** false inside another button (the timeline row): thumbnails are plain images and nothing opens. */
  interactive?: boolean;
}) {
  const { t } = useTranslation();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const total = record.photoIds.length;
  const shown = maxThumbs === undefined ? total : Math.min(total, maxThumbs);
  const hidden = total - shown;

  const Tag = interactive ? "button" : "span";
  const tagProps = interactive ? { type: "button" as const } : {};

  return (
    <>
      <span className="flex gap-1 overflow-x-auto">
        {record.photoIds.slice(0, shown).map((photoId, index) => (
          <PhotoThumb
            key={photoId}
            photoId={photoId}
            recordId={record.id}
            size={thumbSize}
            label={`${t("photo_viewer_title")} ${t("photo_viewer_position", { index: index + 1, total })}`}
            onClick={interactive ? () => setViewerIndex(index) : undefined}
          />
        ))}
        {hidden > 0 ? (
          <Tag
            {...tagProps}
            className="flex shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground"
            style={{ width: thumbSize, height: thumbSize }}
            onClick={interactive ? () => setViewerIndex(shown) : undefined}
          >
            {`+${hidden}`}
          </Tag>
        ) : null}
      </span>
      {viewerIndex !== null ? (
        <PhotoViewer
          record={record}
          startIndex={viewerIndex}
          open
          onOpenChange={(open) => {
            if (!open) setViewerIndex(null);
          }}
        />
      ) : null}
    </>
  );
}
