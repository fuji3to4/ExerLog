"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Ellipsis } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import { createExerciseSet, setExerciseInSet } from "@/features/storage/exercise-sets.repository";
import type { ExerciseSet, ExerciseVideo } from "@/lib/types";

import { SetNameDialog } from "./set-name-dialog";

export type ExerciseSetMenuProps = {
  exercise: ExerciseVideo;
  sets: ExerciseSet[];
  /** Called after a set was created or a membership changed, so the caller can reload. */
  onChanged(): void;
};

const ITEM_CLASS =
  "flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-secondary";

/** "⋯" button on a library card that drops down the sets this video can be added to. */
export function ExerciseSetMenu({ exercise, sets, onChanged }: ExerciseSetMenuProps) {
  const { t } = useTranslation();
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);

  async function handleToggle(set: ExerciseSet, included: boolean) {
    await setExerciseInSet(set.id, exercise.id, included);
    onChanged();
  }

  async function handleCreate(name: string) {
    await createExerciseSet(name, [exercise.id]);
    setIsNameDialogOpen(false);
    onChanged();
  }

  return (
    <>
      {/* Non-modal so the name dialog opened from an item takes over focus and pointer events cleanly. */}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="exercise-set-menu__trigger"
            aria-label={t("set_menu_aria", { title: exercise.title })}
          >
            <Ellipsis aria-hidden className="h-5 w-5" />
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
            {sets.map((set) => (
              <DropdownMenu.CheckboxItem
                key={set.id}
                className={ITEM_CLASS}
                checked={set.exerciseIds.includes(exercise.id)}
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
              </DropdownMenu.CheckboxItem>
            ))}
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
