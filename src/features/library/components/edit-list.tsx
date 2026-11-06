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

type EditListProps = {
  exercises: ListEntry[];
  /** "remove" takes the entry out of a my-list; "delete" deletes the video itself (すべて). */
  removeKind: "remove" | "delete";
  /** Called after every drop with the whole list's new order as entry keys; the caller saves it at once. */
  onReorder(keys: string[]): void;
  onEdit(exercise: ListEntry): void;
  onRemove(exercise: ListEntry): void;
};

/**
 * The library's edit mode: compact rows instead of big cards, so a long list fits on screen and a
 * video can be dragged far. Only the ≡ handle starts a drag; the rest of the row scrolls.
 */
export function EditList({ exercises, removeKind, onReorder, onEdit, onRemove }: EditListProps) {
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
              <EditRow
                key={exercise.entryKey}
                exercise={exercise}
                removeKind={removeKind}
                onEdit={() => onEdit(exercise)}
                onRemove={() => onRemove(exercise)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  );
}

type EditRowProps = {
  exercise: ListEntry;
  removeKind: "remove" | "delete";
  onEdit(): void;
  onRemove(): void;
};

function EditRow({ exercise, removeKind, onEdit, onRemove }: EditRowProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: exercise.entryKey,
  });
  const thumbnailUrl = resolveExerciseThumbnailUrl(exercise);
  const title = exercise.title;

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
      <div className="reorder-list__body">
        <span className="reorder-list__title">{title}</span>
        <div className="reorder-list__actions">
          <button type="button" className="reorder-list__action" onClick={onEdit} aria-label={t("library_edit_aria", { title })}>
            {t("action_edit")}
          </button>
          <button
            type="button"
            className="reorder-list__action reorder-list__action--danger"
            onClick={onRemove}
            aria-label={removeKind === "remove" ? t("library_remove_aria", { title }) : t("library_delete_aria", { title })}
          >
            {removeKind === "remove" ? t("action_remove") : t("action_delete")}
          </button>
        </div>
      </div>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="reorder-list__handle"
        aria-label={t("library_reorder_handle_aria", { title })}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" size={20} />
      </button>
    </li>
  );
}
