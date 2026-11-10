import type { CustomRecord, CustomValue } from "@/lib/types";
import { resolveText, type CustomField, type CustomRecordDefinition } from "./definition";

/** Sheet cell for one value: numbers as-is, multiChoice joined with "|", booleans "1"/"0". */
export function encodeCell(value: CustomValue | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.join("|");
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

/** With no field (a removed field) a non-empty cell stays a raw string. */
export function decodeCell(field: CustomField | undefined, raw: string): CustomValue | undefined {
  if (raw === "") return undefined;
  if (field === undefined) return raw;
  switch (field.type) {
    case "number":
    case "scale": {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case "choice":
    case "text":
      return raw;
    case "multiChoice": {
      const ids = raw.split("|").filter((s) => s !== "");
      return ids.length > 0 ? ids : undefined;
    }
    case "boolean":
      return raw === "1" ? true : raw === "0" ? false : undefined;
  }
}

/**
 * A stored value read as its field's type, or undefined when it does not fit.
 * Strings for non-string types (raw sheet cells of a field that was removed and
 * later restored, or typed form input) are decoded like a sheet cell.
 */
export function coerceValue(field: CustomField, value: CustomValue | undefined): CustomValue | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && field.type !== "text" && field.type !== "choice") {
    return decodeCell(field, value.trim());
  }
  switch (field.type) {
    case "number":
    case "scale":
      return typeof value === "number" && Number.isFinite(value) ? value : undefined;
    case "choice":
    case "text":
      return typeof value === "string" && value !== "" ? value : undefined;
    case "multiChoice": {
      if (!Array.isArray(value)) return undefined;
      const ids = value.filter((v): v is string => typeof v === "string" && v !== "");
      return ids.length > 0 ? ids : undefined;
    }
    case "boolean":
      return typeof value === "boolean" ? value : undefined;
  }
}

/** Keeps only values that fit their field; ids not in the definition (removed fields) pass through. */
export function normalizeValues(
  definition: CustomRecordDefinition,
  values: Record<string, unknown>,
): Record<string, CustomValue> {
  const fields = new Map(definition.fields.map((f) => [f.id, f]));
  const out: Record<string, CustomValue> = {};
  for (const [id, value] of Object.entries(values)) {
    const field = fields.get(id);
    if (field === undefined) {
      if (value !== undefined) out[id] = value as CustomValue;
      continue;
    }
    const normalized = coerceValue(field, value as CustomValue | undefined);
    if (normalized !== undefined) out[id] = normalized;
  }
  return out;
}

/** "30 g・ホエイ・トレ後": fields with a value, in definition order. Removed fields are left out. */
export function formatRecordLine(
  definition: CustomRecordDefinition,
  record: CustomRecord,
  language: string,
  sep: string,
): string {
  const parts: string[] = [];
  for (const field of definition.fields) {
    const value = coerceValue(field, record.values[field.id]);
    if (value === undefined) continue;
    const label = resolveText(field.label, language);
    switch (field.type) {
      case "number":
        parts.push(field.unit ? `${value} ${field.unit}` : `${label} ${value}`);
        break;
      case "scale":
        parts.push(`${label} ${value}/${field.levels}`);
        break;
      case "choice": {
        const option = field.options.find((o) => o.id === value);
        parts.push(option ? resolveText(option.label, language) : String(value));
        break;
      }
      case "multiChoice": {
        const ids = Array.isArray(value) ? value : [String(value)];
        const labels = ids.map((id) => {
          const option = field.options.find((o) => o.id === id);
          return option ? resolveText(option.label, language) : id;
        });
        parts.push(labels.join(language === "ja" ? "、" : ", "));
        break;
      }
      case "boolean":
        if (value === true) parts.push(label);
        break;
      case "text":
        parts.push(String(value));
        break;
    }
  }
  return parts.join(sep);
}
