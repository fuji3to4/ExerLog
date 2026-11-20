import { en } from "@/features/i18n/messages/en";
import { ja } from "@/features/i18n/messages/ja";
import type { Messages } from "@/features/i18n/messages";
import type { ModuleTag } from "../module-tags";
import type { CustomRecordDefinition, CustomField, DefinitionError, LocalizedText } from "./definition";

/** The same message in both app languages, so an exported template reads right in either. */
function both(key: keyof Messages): LocalizedText {
  return { ja: ja[key], en: en[key] };
}

const SCORE_HINTS = { lowLabel: both("wellness_score_hint_low"), highLabel: both("wellness_score_hint_high") };

const MEASURE = { type: "number", required: false, step: 0.1 } as const;

/**
 * Definitions shipped with the app. Their ids double as module ids (no "custom:" prefix).
 * They are built from i18n messages, so editing those message texts changes the shipped
 * definition: add the new seed date to KNOWN_SEED_UPDATED_ATS / bump BUILTIN_SEED_UPDATED_AT.
 */
const DEFINITIONS = {
  wellness: {
    exerlogRecordType: 1,
    id: "wellness",
    name: both("module_wellness_label"),
    icon: "🙂",
    color: "#e07a5f",
    description: both("module_wellness_description"),
    fields: [
      { id: "physical", label: both("history_graph_metric_physical"), type: "scale", required: true, levels: 5, ...SCORE_HINTS },
      { id: "mental", label: both("history_graph_metric_mental"), type: "scale", required: true, levels: 5, ...SCORE_HINTS },
    ],
  },
  body: {
    exerlogRecordType: 1,
    id: "body",
    name: both("module_body_label"),
    icon: "⚖️",
    color: "#7a4fb0",
    description: both("module_body_description"),
    fields: [
      { id: "weight", label: both("measurement_item_weight"), ...MEASURE, unit: "kg", min: 1, max: 500 },
      { id: "bodyFat", label: both("measurement_item_body_fat"), ...MEASURE, unit: "%", min: 1, max: 99 },
      { id: "height", label: both("measurement_item_height"), ...MEASURE, unit: "cm", min: 30, max: 300 },
    ],
  },
  selfcare: {
    exerlogRecordType: 1,
    id: "selfcare",
    name: both("module_selfcare_label"),
    icon: "🧴",
    color: "#3a9e7e",
    description: both("module_selfcare_description"),
    fields: [
      {
        id: "item",
        label: { ja: "種類", en: "Type" },
        type: "choice",
        required: true,
        options: [
          { id: "skincare", label: both("selfcare_item_skincare") },
          { id: "exercise", label: both("selfcare_item_exercise") },
          { id: "other", label: both("selfcare_item_other") },
        ],
      },
      { id: "minutes", label: { ja: "時間", en: "Duration" }, type: "number", required: false, unit: "分", min: 1, step: 1 },
    ],
  },
  girth: {
    exerlogRecordType: 1,
    id: "girth",
    name: both("module_girth_label"),
    icon: "📏",
    color: "#8a6d1f",
    description: both("module_girth_description"),
    fields: [
      { id: "chest", label: both("measurement_item_chest"), ...MEASURE, unit: "cm", min: 30, max: 250 },
      { id: "waist", label: both("measurement_item_waist"), ...MEASURE, unit: "cm", min: 30, max: 250 },
    ],
  },
} satisfies Record<string, CustomRecordDefinition>;

export const BUILTIN_IDS = ["wellness", "body", "selfcare", "girth"] as const;
export type BuiltinId = (typeof BUILTIN_IDS)[number];

export function isBuiltinId(id: string): id is BuiltinId {
  return (BUILTIN_IDS as readonly string[]).includes(id);
}

/** The shipped definition for a built-in id (the shape parseDefinition produces). */
export function builtinDefinition(id: BuiltinId): CustomRecordDefinition {
  return DEFINITIONS[id];
}

const TAGS: Partial<Record<BuiltinId, readonly ModuleTag[]>> = { selfcare: ["lymphedema"] };

export function builtinTags(id: BuiltinId): readonly ModuleTag[] | undefined {
  return TAGS[id];
}

/** Fixed timestamp for seeded definitions, so any real edit always sorts newer. */
export const BUILTIN_SEED_UPDATED_AT = "2000-01-01T00:00:00+00:00";
/** Every seed timestamp ever shipped; a definition carrying one is an untouched seed. */
export const KNOWN_SEED_UPDATED_ATS: readonly string[] = [BUILTIN_SEED_UPDATED_AT];

/** Fields of the body definition that BMI depends on: id -> required unit. */
const LOCKED_BODY_FIELDS: Record<string, string> = { weight: "kg", height: "cm" };

/** Violations of the body weight/height rules. [] for non-built-in ids or when nothing is wrong. */
export function lockedFieldErrors(definition: CustomRecordDefinition): DefinitionError[] {
  if (definition.id !== "body") return [];
  const errors: DefinitionError[] = [];
  for (const [id, unit] of Object.entries(LOCKED_BODY_FIELDS)) {
    const field: CustomField | undefined = definition.fields.find((f) => f.id === id);
    if (field === undefined || field.type !== "number" || field.unit !== unit) {
      errors.push({ code: "locked_field", path: `fields.${id}` });
    }
  }
  return errors;
}

/** Whether a device's definition equals the shipped one (deep JSON comparison). */
export function isDefaultDefinition(id: BuiltinId, definition: CustomRecordDefinition): boolean {
  return JSON.stringify(sortKeys(definition)) === JSON.stringify(sortKeys(builtinDefinition(id)));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}
