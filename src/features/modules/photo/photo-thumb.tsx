"use client";

import { useTranslation } from "@/features/i18n/use-translation";
import { usePhotoUrl } from "./use-photo-url";

const STATUS_KEYS = {
  loading: "photo_loading",
  "not-uploaded": "photo_not_uploaded",
  "signed-out": "photo_signed_out",
  failed: "photo_failed",
} as const;

/** One photo as a square thumbnail; shows a short status text while it is not available. */
export function PhotoThumb({
  photoId,
  recordId,
  size,
  onClick,
  label,
}: {
  photoId: string;
  recordId: string;
  size: number;
  onClick?(): void;
  /** Accessible name of the button, or the alt text of the image when there is no onClick. */
  label?: string;
}) {
  const { t } = useTranslation();
  const state = usePhotoUrl(photoId, recordId);
  const body =
    state.status === "ready" ? (
      // eslint-disable-next-line @next/next/no-img-element -- local blob URL
      <img src={state.url} alt={onClick ? "" : (label ?? "")} className="size-full object-cover" />
    ) : (
      <span className="flex size-full items-center justify-center p-0.5 text-center text-[9px] leading-tight text-muted-foreground">
        {t(STATUS_KEYS[state.status])}
      </span>
    );
  const className = "block shrink-0 overflow-hidden rounded-md bg-muted";
  const style = { width: size, height: size };
  if (!onClick) {
    return (
      <span className={className} style={style}>
        {body}
      </span>
    );
  }
  return (
    <button type="button" className={className} style={style} aria-label={label} onClick={onClick}>
      {body}
    </button>
  );
}
