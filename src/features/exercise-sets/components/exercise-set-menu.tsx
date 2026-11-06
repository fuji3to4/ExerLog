"use client";

import { useEffect, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, EllipsisVertical, Plus } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import {
  addExerciseToSet,
  createExerciseSet,
  removeSetEntry,
  setExerciseInSet,
} from "@/features/storage/exercise-sets.repository";
import type { ExerciseSet, ExerciseVideo } from "@/lib/types";
import { cn } from "@/lib/utils";

import { SetNameDialog } from "./set-name-dialog";

export type ExerciseSetMenuProps = {
  exercise: ExerciseVideo;
  sets: ExerciseSet[];
  /** Called after a set was created or a membership changed, so the caller can reload. */
  onChanged(): void;
  /** "icon" is the small ⋮ for cards; "button" is a labelled round button for detail pages. */
  variant?: "icon" | "button";
  /** The card stands for this position of a shown my-list: offers 「このリストから外す」 for just that card. */
  entry?: { setId: string; entryKey: string };
  /** Called after `entry` was removed, so a caller holding an order by entry key can renumber it. */
  onEntryRemoved?(entryKey: string): void;
};

const ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-secondary";

/** "⋮" / "+ Set" menu on a video card (library, Today, detail) that drops down the sets this video can be added to. */
export function ExerciseSetMenu({ exercise, sets, onChanged, variant = "icon", entry, onEntryRemoved }: ExerciseSetMenuProps) {
  const { t } = useTranslation();
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  // The list whose ＋ was just tapped: its ＋ shows a ✓ for a moment and the addition is announced.
  const [justAdded, setJustAdded] = useState<ExerciseSet | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
  }, []);

  function handleAddAgain(set: ExerciseSet) {
    void runAndReload(async () => {
      await addExerciseToSet(set.id, exercise.id);
      setJustAdded(set);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setJustAdded(null), 1200);
    });
  }

  async function handleToggle(set: ExerciseSet, included: boolean) {
    try {
      await setExerciseInSet(set.id, exercise.id, included);
    } catch (error) {
      console.error(error);
    } finally {
      // Re-sync the checkboxes with the store whether or not the write succeeded.
      onChanged();
    }
  }

  async function runAndReload(write: () => Promise<void>) {
    try {
      await write();
    } catch (error) {
      console.error(error);
    } finally {
      onChanged();
    }
  }

  async function handleCreate(name: string) {
    // A failure propagates so the dialog stays open and shows its error.
    try {
      await createExerciseSet(name, [exercise.id]);
      setIsNameDialogOpen(false);
    } finally {
      onChanged();
    }
  }

  return (
    <>
      {/* Non-modal so the name dialog opened from an item takes over focus and pointer events cleanly. */}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className={variant === "button" ? "exercise-set-menu__button" : "exercise-set-menu__icon"}
            aria-label={t("set_menu_aria", { title: exercise.title })}
          >
            {variant === "button" ? (
              <>
                <Plus aria-hidden className="h-5 w-5" />
                <span>{t("set_menu_button")}</span>
              </>
            ) : (
              <EllipsisVertical aria-hidden className="h-5 w-5" />
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-48 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs text-muted-foreground">
              {t("set_menu_title")}
            </DropdownMenu.Label>
            {sets.map((set) => {
              const count = set.exerciseIds.filter((id) => id === exercise.id).length;
              const isIncluded = count > 0;
              const isJustAdded = justAdded?.id === set.id;
              return (
                <div key={set.id} className="exercise-set-menu__row">
                  <DropdownMenu.CheckboxItem
                    className={cn(ITEM_CLASS, "flex-1")}
                    checked={isIncluded}
                    // Keep the menu open so several sets can be toggled in a row.
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(checked) => void handleToggle(set, checked)}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center">
                      <DropdownMenu.ItemIndicator>
                        <Check aria-hidden className="h-4 w-4" />
                      </DropdownMenu.ItemIndicator>
                    </span>
                    {set.name}
                    {count > 1 ? <span className="exercise-set-menu__count">×{count}</span> : null}
                  </DropdownMenu.CheckboxItem>
                  {isIncluded ? (
                    // The video can sit in a list more than once (spaced apart after reordering).
                    <DropdownMenu.Item
                      className="exercise-set-menu__add-again"
                      aria-label={t("set_menu_add_again_aria", { name: set.name })}
                      data-added={isJustAdded ? "true" : undefined}
                      onSelect={(event) => {
                        event.preventDefault();
                        handleAddAgain(set);
                      }}
                    >
                      {isJustAdded ? <Check aria-hidden className="h-4 w-4" /> : <Plus aria-hidden className="h-4 w-4" />}
                    </DropdownMenu.Item>
                  ) : null}
                </div>
              );
            })}
            <span role="status" className="sr-only">
              {justAdded ? t("set_menu_added_again", { name: justAdded.name }) : ""}
            </span>
            {entry ? (
              <>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  className={ITEM_CLASS}
                  onSelect={() =>
                    void runAndReload(async () => {
                      await removeSetEntry(entry.setId, entry.entryKey);
                      onEntryRemoved?.(entry.entryKey);
                    })
                  }
                >
                  {t("set_entry_remove")}
                </DropdownMenu.Item>
              </>
            ) : null}
            {sets.length > 0 ? <DropdownMenu.Separator className="my-1 h-px bg-border" /> : null}
            <DropdownMenu.Item className={ITEM_CLASS} onSelect={() => setIsNameDialogOpen(true)}>
              {t("set_menu_new")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <SetNameDialog
        open={isNameDialogOpen}
        title={t("set_name_new_title")}
        initialName=""
        onSubmit={handleCreate}
        onOpenChange={setIsNameDialogOpen}
      />
    </>
  );
}
