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
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronUp, GripVertical, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/features/i18n/use-translation";
import { downloadTextFile } from "@/lib/download";
import { cn } from "@/lib/utils";
import { customModuleId } from "../custom/data";
import type { CustomRecordDefinition } from "../custom/definition";
import { builtInTemplate } from "../custom/templates";
import { getCustomTypes, markTypeDeleted } from "../custom/type-store";
import { ModuleIcon, moduleDescription, moduleLabel } from "../module-text";
import type { RecordModule } from "../types";
import { useModuleSettings } from "../use-module-settings";

const MENU_ITEM_CLASS =
  "flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-secondary";

/** The definition a row can export: a custom type's own, or a code module's built-in template. */
function exportableDefinition(module: RecordModule): CustomRecordDefinition | undefined {
  if (!module.isCustom) return builtInTemplate(module.data.id);
  return getCustomTypes().find((candidate) => customModuleId(candidate.id) === module.data.id)?.definition;
}

/**
 * The "⋯" drop-down of a row: export the definition as JSON, and for custom rows start deleting it.
 * Code modules with a built-in template only export, so the template can be copied and customized.
 */
function RowMenu({ module, label, onDelete }: { module: RecordModule; label: string; onDelete?(): void }) {
  const { t } = useTranslation();

  function exportDefinition() {
    const definition = exportableDefinition(module);
    if (!definition) return;
    downloadTextFile(`exerlog-${definition.id}.json`, JSON.stringify(definition, null, 2), "application/json");
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={t("custom_menu_aria", { name: label })}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontal aria-hidden className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-40 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <DropdownMenu.Item className={MENU_ITEM_CLASS} onSelect={exportDefinition}>
            {t("custom_export")}
          </DropdownMenu.Item>
          {onDelete ? (
            <DropdownMenu.Item className={MENU_ITEM_CLASS} onSelect={onDelete}>
              {t("custom_delete")}
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

type RowProps = {
  module: RecordModule;
  enabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggle(enabled: boolean): void;
  onMove(delta: -1 | 1): void;
};

function ModuleRow({ module, enabled, isFirst, isLast, onToggle, onMove }: RowProps) {
  const { t, language } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.data.id });
  const label = moduleLabel(module, t, language);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  async function deleteType() {
    setDeleteFailed(false);
    try {
      await markTypeDeleted(module.data.id.slice("custom:".length), true);
    } catch {
      setDeleteFailed(true);
    }
  }
  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <li
      ref={setNodeRef}
      data-testid="module-row"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-2 rounded-lg border bg-card px-2 py-2 ${isDragging ? "relative z-10 shadow-md" : ""}`}
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
      <ModuleIcon module={module} className="h-5 w-5 shrink-0" />
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
          {module.isCustom ? (
            <span
              className={cn(badgeVariants({ variant: "secondary" }), "ml-2 px-1.5 py-0 align-middle text-[10px] font-medium")}
            >
              {t("custom_badge")}
            </span>
          ) : null}
        </span>
        <span className="block text-xs text-muted-foreground">{moduleDescription(module, t, language)}</span>
      </span>
      {/* Left of the arrows, so the arrows and the switch line up on every row. */}
      {module.isCustom ? (
        <RowMenu module={module} label={label} onDelete={() => setConfirmingDelete(true)} />
      ) : builtInTemplate(module.data.id) ? (
        <RowMenu module={module} label={label} />
      ) : null}
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
      {confirmingDelete ? (
        <div className="bulk-delete-confirm w-full">
          <p className="bulk-delete-confirm__message">{t("custom_delete_confirm")}</p>
          <div className="bulk-delete-confirm__actions">
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              {t("settings_delete_cancel_btn")}
            </Button>
            <Button variant="destructive" onClick={() => void deleteType()}>
              {t("settings_delete_confirm_btn")}
            </Button>
          </div>
          {deleteFailed ? (
            <p role="alert" className="text-sm text-[var(--danger-text)]">
              {t("custom_save_failed")}
            </p>
          ) : null}
        </div>
      ) : null}
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
