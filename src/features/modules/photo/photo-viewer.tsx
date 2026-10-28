"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import type { PhotoRecord } from "@/lib/types";
import { usePhotoUrl } from "./use-photo-url";

const STATUS_KEYS = {
  loading: "photo_loading",
  "not-uploaded": "photo_not_uploaded",
  "signed-out": "photo_signed_out",
  failed: "photo_failed",
} as const;

/** Controls on the always-dark backdrop: white, at least 44px, independent of the theme. */
const CONTROL_CLASS =
  "absolute flex size-12 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";
const NAV_CLASS = `${CONTROL_CLASS} top-1/2 -translate-y-1/2`;

function ViewerImage({ photoId, recordId }: { photoId: string; recordId: string }) {
  const { t } = useTranslation();
  const state = usePhotoUrl(photoId, recordId);
  if (state.status === "ready") {
    // eslint-disable-next-line @next/next/no-img-element -- local blob URL
    return <img src={state.url} alt="" className="max-h-full max-w-full object-contain" />;
  }
  return <p className="text-sm text-white">{t(STATUS_KEYS[state.status])}</p>;
}

/** Full-screen view of a record's photos; ← → or the side buttons move between them. */
export function PhotoViewer({
  record,
  startIndex,
  open,
  onOpenChange,
}: {
  record: PhotoRecord;
  startIndex: number;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const { t } = useTranslation();
  const total = record.photoIds.length;
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0)));
  const photoId = record.photoIds[index];
  const hasPrev = index > 0;
  const hasNext = index < total - 1;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft" && hasPrev) setIndex(index - 1);
    else if (event.key === "ArrowRight" && hasNext) setIndex(index + 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onKeyDown={onKeyDown}
        hideCloseButton
        className="left-0 top-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-0 bg-black/95 p-0 text-white sm:p-0"
      >
        <DialogTitle className="sr-only">{t("photo_viewer_title")}</DialogTitle>
        <div className="flex size-full items-center justify-center p-10">
          {photoId ? <ViewerImage key={photoId} photoId={photoId} recordId={record.id} /> : null}
        </div>
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white">
          {t("photo_viewer_position", { index: index + 1, total })}
        </p>
        {hasPrev ? (
          <button type="button" aria-label={t("photo_viewer_prev")} className={`${NAV_CLASS} left-2`} onClick={() => setIndex(index - 1)}>
            <ChevronLeft className="size-6" />
          </button>
        ) : null}
        {hasNext ? (
          <button type="button" aria-label={t("photo_viewer_next")} className={`${NAV_CLASS} right-2`} onClick={() => setIndex(index + 1)}>
            <ChevronRight className="size-6" />
          </button>
        ) : null}
        <DialogClose aria-label={t("photo_viewer_close")} className={`${CONTROL_CLASS} right-2 top-2`}>
          <X className="size-7" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
