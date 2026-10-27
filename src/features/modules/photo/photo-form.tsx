"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeField, TimelineDialogFooter, useSaveAndClose } from "@/features/timeline/components/timeline-dialog-parts";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { PhotoRecord } from "@/lib/types";
import type { RecordFormProps } from "../types";
import {
  addPhotoRecord,
  deletePhotoRecord,
  getPhotoBlob,
  MAX_PHOTOS_PER_RECORD,
  type NewPhoto,
  updatePhotoRecord,
} from "./repository";
import { resizeImage } from "./resize";

type Item =
  | { key: string; kind: "existing"; photoId: string }
  | { key: string; kind: "new"; photo: NewPhoto | null; url: string | null };

const BUTTON_CLASS = "flex-1 rounded-lg bg-muted px-3 py-2 text-sm";
const NOTE_CLASS =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring";

/** Time, photos and note of a photo record. Mount it only while its dialog is open. */
export function PhotoForm({ onOpenChange, date, record, onSaved, onDeleted }: RecordFormProps<PhotoRecord>) {
  const { t } = useTranslation();
  const noteId = useId();
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [note, setNote] = useState(record?.note ?? "");
  const [items, setItems] = useState<Item[]>(() =>
    (record?.photoIds ?? []).map((photoId) => ({ key: photoId, kind: "existing", photoId })),
  );
  const [existingUrls, setExistingUrls] = useState<Record<string, string>>({});
  const [unreadable, setUnreadable] = useState(false);
  const [overLimit, setOverLimit] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const urlsRef = useRef(new Set<string>());
  const mountedRef = useRef(false);
  const takeRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLInputElement>(null);
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  useEffect(() => {
    mountedRef.current = true;
    const urls = urlsRef.current;
    return () => {
      mountedRef.current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const photoId of record?.photoIds ?? []) {
      void getPhotoBlob(photoId).then((row) => {
        if (cancelled || !mountedRef.current || !row?.blob) return;
        const url = URL.createObjectURL(row.blob);
        urlsRef.current.add(url);
        setExistingUrls((current) => ({ ...current, [photoId]: url }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [record]);

  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const room = Math.max(0, MAX_PHOTOS_PER_RECORD - itemsRef.current.length);
    const accepted = files.slice(0, room);
    setOverLimit(files.length > accepted.length);
    setUnreadable(false);
    const placeholders: Item[] = accepted.map(() => ({
      key: crypto.randomUUID(),
      kind: "new",
      photo: null,
      url: null,
    }));
    setItems((current) => [...current, ...placeholders]);
    for (const [index, file] of accepted.entries()) {
      const key = placeholders[index].key;
      try {
        const photo = await resizeImage(file);
        if (!mountedRef.current) return;
        const url = URL.createObjectURL(photo.blob);
        urlsRef.current.add(url);
        setItems((current) => current.map((item) => (item.key === key ? { key, kind: "new", photo, url } : item)));
      } catch {
        if (!mountedRef.current) return;
        setUnreadable(true);
        setItems((current) => current.filter((item) => item.key !== key));
      }
    }
  }

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    void addFiles(files);
    event.target.value = "";
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  const isProcessing = items.some((item) => item.kind === "new" && !item.photo);
  const canSave = time !== "" && items.length > 0 && !isProcessing;

  function save() {
    const recordedAt = withLocalTime(baseAt, time);
    const added = items.flatMap((item) => (item.kind === "new" && item.photo ? [item.photo] : []));
    const keepPhotoIds = items.flatMap((item) => (item.kind === "existing" ? [item.photoId] : []));
    void run(
      async () => {
        if (!record) {
          return addPhotoRecord({ date, recordedAt, note, photos: added });
        }
        return updatePhotoRecord(record, { note, recordedAt, keepPhotoIds, added });
      },
      (saved) => {
        onOpenChange(false);
        onSaved(saved);
      },
    );
  }

  async function remove() {
    if (!record) return;
    await deletePhotoRecord(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => {
            const url = item.kind === "existing" ? existingUrls[item.photoId] : item.url;
            return (
              <div key={item.key} className="relative size-16 rounded-lg bg-muted">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                  <img src={url} alt={String(index + 1)} className="size-full rounded-lg object-cover" />
                ) : item.kind === "new" ? (
                  <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                    {t("photo_processing")}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={t("photo_remove")}
                  className="absolute -right-1.5 -top-1.5 size-5 rounded-full bg-foreground text-xs leading-5 text-background"
                  onClick={() => removeItem(item.key)}
                >
                  ×
                </button>
              </div>
            );
          })}
          {items.length < MAX_PHOTOS_PER_RECORD ? (
            <button
              type="button"
              className="flex size-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 text-[10px] text-muted-foreground"
              onClick={() => chooseRef.current?.click()}
            >
              {t("photo_add")}
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button type="button" className={BUTTON_CLASS} onClick={() => takeRef.current?.click()}>
            {t("photo_take")}
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => chooseRef.current?.click()}>
            {t("photo_choose")}
          </button>
        </div>
        <input ref={takeRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        <input ref={chooseRef} type="file" accept="image/*" multiple hidden onChange={pick} />
        {unreadable ? (
          <p role="status" className="text-sm text-destructive">
            {t("photo_unreadable")}
          </p>
        ) : null}
        {overLimit ? (
          <p role="status" className="text-sm text-destructive">
            {t("photo_limit")}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="text-sm font-medium">
          {t("timeline_note")}
        </label>
        <textarea id={noteId} rows={2} className={NOTE_CLASS} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <TimelineDialogFooter
        isSaved={isSaved}
        isBusy={isBusy}
        hasError={hasError}
        canSave={canSave}
        onSave={save}
        onDelete={record ? remove : undefined}
      />
    </div>
  );
}
