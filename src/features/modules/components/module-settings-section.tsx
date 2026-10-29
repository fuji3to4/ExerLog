"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import { badgeVariants } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/features/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { RecordModule } from "../types";
import { useModuleSettings } from "../use-module-settings";

type RowProps = {
  module: RecordModule;
  enabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle(enabled: boolean): void;
  onMove(delta: -1 | 1): void;
};

function ModuleRow({ module, enabled, isFirst, isLast, onToggle, onMove }: RowProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.data.id });
  const Icon = module.icon;
  const label = t(module.labelKey);
  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <li
      ref={setNodeRef}
      data-testid="module-row"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-card px-2 py-2 ${isDragging ? "relative z-10 shadow-md" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={t("settings_module_reorder")}
        className={`${iconButton} cursor-grab touch-none`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden className="h-4 w-4" />
      </button>
      <Icon aria-hidden className="h-5 w-5 shrink-0" style={{ color: module.color }} />
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-medium">
          {label}
          {module.tags?.map((tag) => (
            <span
              key={tag}
              className={cn(badgeVariants({ variant: "secondary" }), "ml-2 px-1.5 py-0 align-middle text-[10px] font-medium")}
            >
              {t(`module_tag_${tag}` as const)}
            </span>
          ))}
        </span>
        <span className="block text-xs text-muted-foreground">{t(module.descriptionKey)}</span>
      </span>
      <button
        type="button"
        className={iconButton}
        aria-label={t("settings_module_move_up")}
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <ChevronUp aria-hidden className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={t("settings_module_move_down")}
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <ChevronDown aria-hidden className="h-4 w-4" />
      </button>
      <Switch checked={enabled} onCheckedChange={onToggle} aria-label={label} />
    </li>
  );
}

/** Settings card body: switch each record module on/off and set the order of the ON ones. */
export function ModuleSettingsSection() {
  const { t } = useTranslation();
  const { entries, setEnabled, move } = useModuleSettings();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = entries.map((entry) => entry.module.data.id);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const newIndex = ids.indexOf(String(over.id));
    if (newIndex >= 0) move(String(active.id), newIndex);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("settings_modules_hint")}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {entries.map(({ module, enabled }, index) => (
              <ModuleRow
                key={module.data.id}
                module={module}
                enabled={enabled}
                isFirst={index === 0}
                isLast={index === entries.length - 1}
                onToggle={(next) => setEnabled(module.data.id, next)}
                onMove={(delta) => move(module.data.id, index + delta)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
