"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/features/i18n/use-translation";
import { deleteWatchEvent, updateWatchEvent } from "@/features/storage/watch-events.repository";
import { timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { WatchEvent } from "@/lib/types";
import { TimeField, TimelineDialogFooter, useSaveAndClose } from "./timeline-dialog-parts";

export type WatchEventDialogProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  event: WatchEvent;
  onSaved(event: WatchEvent): void;
  onDeleted(): void;
};

export function WatchEventDialog(props: WatchEventDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("timeline_watch_edit_title")}</DialogTitle>
        </DialogHeader>
        <WatchEventForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function WatchEventForm({ onOpenChange, event, onSaved, onDeleted }: WatchEventDialogProps) {
  const [time, setTime] = useState(() => timeOfIso(event.watchedAt));
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  function save() {
    const updated: WatchEvent = { ...event, watchedAt: withLocalTime(event.watchedAt, time) };
    void run(
      async () => {
        await updateWatchEvent(updated);
        return updated;
      },
      (saved) => {
        onOpenChange(false);
        onSaved(saved);
      },
    );
  }

  async function remove() {
    await deleteWatchEvent(event.id);
    onOpenChange(false);
    onDeleted();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      <TimelineDialogFooter
        isSaved={isSaved}
        isBusy={isBusy}
        hasError={hasError}
        canSave={time !== ""}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
}
