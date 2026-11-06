"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { useTranslation } from "@/features/i18n/use-translation";
import type { ListEntry } from "@/features/exercise-sets/list-entries";
import { cn } from "@/lib/utils";
import { resolveExerciseThumbnailUrl } from "@/lib/video/youtube";

type ReorderListProps = {
  exercises: ListEntry[];
  /** Called after every drop with the whole list's new order as entry keys (a draft; nothing is stored here). */
  onReorder(keys: string[]): void;
  onSave(): void;
  onCancel(): void;
};

/**
 * The library's reorder mode: compact rows instead of big cards, so a long list fits on screen
 * and a video can be dragged far. Only the ≡ handle starts a drag; the rest of the row scrolls.
 */
export function ReorderList({ exercises, onReorder, onSave, onCancel }: ReorderListProps) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Entry keys: a repeated video is one row per copy.
  const ids = exercises.map((exercise) => exercise.entryKey);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }

  return (
    <section className="reorder-list">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="reorder-list__rows">
            {exercises.map((exercise) => (
              <ReorderRow key={exercise.entryKey} exercise={exercise} handleLabel={t("library_reorder_handle_aria", { title: exercise.title })} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <div className="reorder-list__footer">
        <button type="button" className="settings-action-button settings-action-button--secondary" onClick={onCancel}>
          {t("settings_form_cancel")}
        </button>
        <button type="button" className="settings-action-button" onClick={onSave}>
          {t("settings_form_save")}
        </button>
      </div>
    </section>
  );
}

function ReorderRow({ exercise, handleLabel }: { exercise: ListEntry; handleLabel: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.entryKey,
  });
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);

  return (
    <li
      ref={setNodeRef}
      className={cn("reorder-list__row", isDragging && "is-dragging")}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="reorder-list__thumb" src={thumbnailUrl} alt="" />
      ) : (
        <span className="reorder-list__thumb" aria-hidden="true" />
      )}
      <span className="reorder-list__title">{exercise.title}</span>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="reorder-list__handle"
        aria-label={handleLabel}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" size={20} />
      </button>
    </li>
  );
}
