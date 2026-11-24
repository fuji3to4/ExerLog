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
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, MoreHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/features/i18n/use-translation";
import { downloadTextFile } from "@/lib/download";
import { cn } from "@/lib/utils";
import { customModuleId } from "../custom/data";
import type { CustomRecordDefinition } from "../custom/definition";
import { builtinDefinition, isBuiltinId } from "../custom/builtin";
import {
  countRecordsUnfitForDefault,
  getCustomTypes,
  isBuiltinCustomized,
  markTypeDeleted,
  resetBuiltin,
} from "../custom/type-store";
import { ModuleIcon, moduleDescription, moduleLabel } from "../module-text";
import type { RecordModule } from "../types";
import { useModuleSettings } from "../use-module-settings";

const MENU_ITEM_CLASS =
  "flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm font-medium outline-none data-[highlighted]:bg-secondary";

/** The definition a row can export: the stored one of a custom type or of a built-in record type. */
function exportableDefinition(module: RecordModule): CustomRecordDefinition | undefined {
  const id = module.data.id;
  if (module.isCustom) return getCustomTypes().find((candidate) => customModuleId(candidate.id) === id)?.definition;
  if (!isBuiltinId(id)) return undefined;
  return getCustomTypes().find((candidate) => candidate.id === id)?.definition ?? builtinDefinition(id);
}

type RowMenuProps = { module: RecordModule; label: string; onDelete?(): void; onReset?(): void };

/**
 * The "⋯" drop-down of a row: export the definition as JSON; custom rows can start deleting it,
 * and customized built-in rows can start resetting it to the shipped definition.
 */
function RowMenu({ module, label, onDelete, onReset }: RowMenuProps) {
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
          className="z-50 min-w-40 rounded-[var(--radius-inner)] bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-lift)]"
        >
          <DropdownMenu.Item className={MENU_ITEM_CLASS} onSelect={exportDefinition}>
            {t("custom_export")}
          </DropdownMenu.Item>
          {onReset ? (
            <DropdownMenu.Item className={MENU_ITEM_CLASS} onSelect={onReset}>
              {t("custom_reset")}
            </DropdownMenu.Item>
          ) : null}
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

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:hover:bg-transparent";

type RowBodyProps = {
  module: RecordModule;
  enabled: boolean;
  onToggle(enabled: boolean): void;
  /** Up/down buttons, only on ON rows. */
  moveButtons?: ReactNode;
};

/** A row after its drag handle: name and badges, the "⋯" menu, the arrows (ON rows), the switch and the delete confirm. */
function RowBody({ module, enabled, onToggle, moveButtons }: RowBodyProps) {
  const { t, language } = useTranslation();
  const label = moduleLabel(module, t, language);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [resetUnfit, setResetUnfit] = useState<number | null>(null); // null: not confirming a reset
  const [resetFailed, setResetFailed] = useState(false);
  const builtinId = !module.isCustom && isBuiltinId(module.data.id) ? module.data.id : undefined;
  // Read from the store on every render; the settings rows re-render when it changes.
  const canReset = builtinId !== undefined && isBuiltinCustomized(builtinId);

  async function startReset() {
    if (!builtinId) return;
    setResetFailed(false);
    setResetUnfit(await countRecordsUnfitForDefault(builtinId).catch(() => 0));
  }

  async function reset() {
    if (!builtinId) return;
    setResetFailed(false);
    try {
      await resetBuiltin(builtinId);
      setResetUnfit(null);
    } catch {
      setResetFailed(true);
    }
  }

  async function deleteType() {
    setDeleteFailed(false);
    try {
      await markTypeDeleted(module.data.id.slice("custom:".length), true);
    } catch {
      setDeleteFailed(true);
    }
  }

  return (
    <>
      <ModuleIcon module={module} className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-medium">
          {label}
          {module.tags?.map((tag) => (
            <span
              key={tag}
              className={cn(badgeVariants({ variant: "secondary" }), "ml-2 px-1.5 py-0 align-middle text-[11px] font-medium")}
            >
              {t(`module_tag_${tag}` as const)}
            </span>
          ))}
          {module.isCustom ? (
            <span
              className={cn(badgeVariants({ variant: "secondary" }), "ml-2 px-1.5 py-0 align-middle text-[11px] font-medium")}
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
      ) : builtinId ? (
        <RowMenu module={module} label={label} onReset={canReset ? () => void startReset() : undefined} />
      ) : null}
      {moveButtons}
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
      {resetUnfit !== null && canReset ? (
        <div className="bulk-delete-confirm w-full">
          <p className="bulk-delete-confirm__message">{t("custom_reset_confirm", { name: label })}</p>
          {resetUnfit > 0 ? <p className="bulk-delete-confirm__message">{t("custom_reset_unfit_note")}</p> : null}
          <div className="bulk-delete-confirm__actions">
            <Button variant="secondary" onClick={() => setResetUnfit(null)}>
              {t("settings_delete_cancel_btn")}
            </Button>
            <Button variant="secondary" onClick={() => void reset()}>
              {t("custom_reset")}
            </Button>
          </div>
          {resetFailed ? (
            <p role="alert" className="text-sm text-[var(--danger-text)]">
              {t("custom_save_failed")}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

type OnRowProps = {
  module: RecordModule;
  isFirst: boolean;
  isLast: boolean;
  onToggle(enabled: boolean): void;
  onMove(delta: -1 | 1): void;
};

/** An ON row: drag handle, up/down buttons and the switch. */
function OnModuleRow({ module, isFirst, isLast, onToggle, onMove }: OnRowProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.data.id });

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
        className={`${ICON_BUTTON} cursor-grab touch-none`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden className="h-4 w-4" />
      </button>
      <RowBody
        module={module}
        enabled
        onToggle={onToggle}
        moveButtons={
          <>
            <button
              type="button"
              className={ICON_BUTTON}
              aria-label={t("settings_module_move_up")}
              disabled={isFirst}
              onClick={() => onMove(-1)}
            >
              <ChevronUp aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={ICON_BUTTON}
              aria-label={t("settings_module_move_down")}
              disabled={isLast}
              onClick={() => onMove(1)}
            >
              <ChevronDown aria-hidden className="h-4 w-4" />
            </button>
          </>
        }
      />
    </li>
  );
}

/** Settings card body: the ON modules in order (sortable), then the OFF ones folded away. */
export function ModuleSettingsSection() {
  const { t } = useTranslation();
  const { settings, entries, setEnabled, move } = useModuleSettings();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onModules = entries.filter((entry) => entry.enabled).map((entry) => entry.module);
  const offModules = entries.filter((entry) => !entry.enabled).map((entry) => entry.module);
  const ids = onModules.map((module) => module.data.id);

  // The ON list skips OFF (and hidden) modules, so move to the target's place in the full order.
  function moveTo(id: string, targetId: string) {
    const index = settings.order.indexOf(targetId);
    if (index >= 0) move(id, index);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    moveTo(String(active.id), String(over.id));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("settings_modules_hint")}</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {onModules.map((module, index) => (
              <OnModuleRow
                key={module.data.id}
                module={module}
                isFirst={index === 0}
                isLast={index === onModules.length - 1}
                onToggle={(next) => setEnabled(module.data.id, next)}
                onMove={(delta) => moveTo(module.data.id, ids[index + delta])}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {offModules.length > 0 ? (
        <details className="group rounded-xl border border-border px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium">
            <ChevronRight aria-hidden className="h-4 w-4 transition-transform group-open:rotate-90" />
            {t("settings_modules_off_heading", { count: offModules.length })}
          </summary>
          <ul className="mt-2 space-y-2">
            {offModules.map((module) => (
              <li
                key={module.data.id}
                data-testid="off-module-row"
                className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-2 py-2"
              >
                <RowBody module={module} enabled={false} onToggle={(next) => setEnabled(module.data.id, next)} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
