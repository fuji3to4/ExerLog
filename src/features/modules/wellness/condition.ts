import { builtinDefinition } from "@/features/modules/custom/builtin";
import type { CustomField } from "@/features/modules/custom/definition";
import { coerceValue } from "@/features/modules/custom/values";
import { getCustomTypes } from "@/features/modules/custom/type-store";
import { appDb } from "@/features/storage/app-db";
import type { WellnessScore } from "@/lib/types";

export type ConditionScores = { physicalScore: WellnessScore; mentalScore: WellnessScore };

type ScaleField = Extract<CustomField, { type: "scale" }>;

function scaleField(fields: readonly CustomField[], id: string): ScaleField | null {
  const field = fields.find((f) => f.id === id);
  return field && field.type === "scale" ? field : null;
}

/** Maps a 1..levels step onto the 1..5 range the recommendations use. */
function toFiveScale(value: number, levels: number): WellnessScore {
  const scaled = levels === 5 ? value : Math.round(1 + ((value - 1) * 4) / (levels - 1));
  return Math.min(5, Math.max(1, scaled)) as WellnessScore;
}

/**
 * The only entry point through which the exercise feature reads the condition record.
 * Returns the day's latest scores, or null when the definition has no physical/mental
 * scale fields or the latest record lacks either value.
 */
export async function getLatestConditionScores(dayKey: string): Promise<ConditionScores | null> {
  // The type is always loaded after startup; the built-in covers a first render before that.
  const fields = (getCustomTypes().find((t) => t.id === "wellness")?.definition ?? builtinDefinition("wellness")).fields;
  const physical = scaleField(fields, "physical");
  const mental = scaleField(fields, "mental");
  if (!physical || !mental) return null;

  const rows = await appDb.customRecords.where("[typeId+date]").equals(["wellness", dayKey]).toArray();
  if (rows.length === 0) return null;
  const latest = rows.reduce((a, b) => (Date.parse(b.recordedAt) >= Date.parse(a.recordedAt) ? b : a));

  // Sheet-synced values can arrive as strings, so decode them like the form does.
  const p = coerceValue(physical, latest.values.physical);
  const m = coerceValue(mental, latest.values.mental);
  if (typeof p !== "number" || typeof m !== "number") return null;
  return { physicalScore: toFiveScale(p, physical.levels), mentalScore: toFiveScale(m, mental.levels) };
}
