/** A display string: plain, or keyed by language code. */
export type LocalizedText = string | Record<string, string>;
export type ChoiceOption = { id: string; label: LocalizedText };

type FieldBase = { id: string; label: LocalizedText; required: boolean };
export type CustomField =
  | (FieldBase & { type: "number"; unit?: string; min?: number; max?: number; step?: number })
  | (FieldBase & { type: "scale"; levels: number; lowLabel?: LocalizedText; highLabel?: LocalizedText })
  | (FieldBase & { type: "choice" | "multiChoice"; options: ChoiceOption[] })
  | (FieldBase & { type: "boolean" | "text" });

export type CustomRecordDefinition = {
  exerlogRecordType: 1;
  id: string;
  name: LocalizedText;
  icon: string;
  color: string;
  description?: LocalizedText;
  fields: CustomField[];
};

export type DefinitionErrorCode =
  | "not_json"
  | "not_object"
  | "unsupported_version"
  | "bad_id"
  | "missing_name"
  | "no_fields"
  | "bad_field_id"
  | "reserved_field_id"
  | "duplicate_field_id"
  | "bad_field_type"
  | "missing_label"
  | "no_options"
  | "bad_option_id"
  | "duplicate_option_id"
  | "bad_number"
  | "bad_levels"
  | "type_changed";

export type DefinitionError = { code: DefinitionErrorCode; path: string; value?: string };
export type ParseResult =
  | { ok: true; definition: CustomRecordDefinition }
  | { ok: false; errors: DefinitionError[] };

export const FIXED_COLUMNS = ["id", "date", "recordedAt", "note", "updatedAt"] as const;
export const DEFAULT_ICON = "📝";

const DEFINITION_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const FIELD_ID = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const FIELD_TYPES = ["number", "scale", "choice", "multiChoice", "boolean", "text"] as const;
const DEFAULT_LEVELS = 5;
const MIN_LEVELS = 2;
const MAX_LEVELS = 10;

// Muted, similar in saturation to the built-in module colors.
const PALETTE = ["#5f9e7a", "#5f8fb8", "#b0885a", "#9a74b0", "#b86f7a", "#6aa3a0", "#a39a5a", "#7d86b8"];

export function defaultColor(id: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

export function resolveText(text: LocalizedText | undefined, language: string): string {
  if (text === undefined) return "";
  if (typeof text === "string") return text;
  if (typeof text[language] === "string" && text[language] !== "") return text[language];
  return Object.values(text).find((v) => typeof v === "string" && v !== "") ?? "";
}

/** Candidate JSON texts inside an AI reply: a fenced block first, then the outermost brace span. */
function embeddedJsonCandidates(text: string): string[] {
  const candidates: string[] = [];
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence) candidates.push(fence[1]);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(text.slice(start, end + 1));
  return candidates;
}

export function parseDefinitionText(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // AI replies often wrap the JSON in prose or a code fence.
    let found = false;
    for (const candidate of embeddedJsonCandidates(text)) {
      try {
        parsed = JSON.parse(candidate);
        found = true;
        break;
      } catch {
        // Try the next candidate.
      }
    }
    if (!found) return { ok: false, errors: [{ code: "not_json", path: "" }] };
  }
  return parseDefinition(parsed);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** A non-empty string, or an object with at least one non-empty string value. */
function readText(v: unknown): LocalizedText | undefined {
  if (typeof v === "string") return v.trim() === "" ? undefined : v;
  if (isRecord(v)) {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v)) if (typeof val === "string" && val.trim() !== "") out[k] = val;
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

/** undefined when absent, null when present but not a finite number. */
function optionalNumber(v: unknown): number | undefined | null {
  if (v === undefined) return undefined;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type Fail = (code: DefinitionErrorCode, path: string, value?: unknown) => void;

export function parseDefinition(input: unknown): ParseResult {
  if (!isRecord(input)) return { ok: false, errors: [{ code: "not_object", path: "" }] };
  const errors: DefinitionError[] = [];
  const fail: Fail = (code, path, value) =>
    errors.push(value === undefined ? { code, path } : { code, path, value: String(value) });

  if (input.exerlogRecordType !== undefined && input.exerlogRecordType !== 1) {
    fail("unsupported_version", "exerlogRecordType", input.exerlogRecordType);
  }

  const id = typeof input.id === "string" && DEFINITION_ID.test(input.id) ? input.id : undefined;
  if (id === undefined) fail("bad_id", "id");

  const name = readText(input.name);
  if (name === undefined) fail("missing_name", "name");

  const fields: CustomField[] = [];
  if (!Array.isArray(input.fields) || input.fields.length === 0) {
    fail("no_fields", "fields");
  } else {
    const seen = new Set<string>();
    input.fields.forEach((raw, i) => {
      const field = parseField(raw, `fields[${i}]`, seen, fail);
      if (field) fields.push(field);
    });
  }

  if (errors.length > 0 || id === undefined || name === undefined) return { ok: false, errors };

  const definition: CustomRecordDefinition = {
    exerlogRecordType: 1,
    id,
    name,
    icon: typeof input.icon === "string" && input.icon.trim() !== "" ? input.icon : DEFAULT_ICON,
    color:
      typeof input.color === "string" && /^#[0-9a-fA-F]{6}$/.test(input.color)
        ? input.color.toLowerCase()
        : defaultColor(id),
    fields,
  };
  const description = readText(input.description);
  if (description !== undefined) definition.description = description;
  return { ok: true, definition };
}

function parseField(raw: unknown, path: string, seen: Set<string>, fail: Fail): CustomField | undefined {
  if (!isRecord(raw)) {
    fail("bad_field_type", `${path}.type`);
    return undefined;
  }
  let ok = true;
  const bad: Fail = (code, p, value) => {
    ok = false;
    fail(code, p, value);
  };

  const id = typeof raw.id === "string" ? raw.id : "";
  if (!FIELD_ID.test(id)) bad("bad_field_id", `${path}.id`, typeof raw.id === "string" ? raw.id : undefined);
  else if ((FIXED_COLUMNS as readonly string[]).includes(id)) bad("reserved_field_id", `${path}.id`);
  else if (seen.has(id)) bad("duplicate_field_id", `${path}.id`, id);
  else seen.add(id);

  const label = readText(raw.label);
  if (label === undefined) bad("missing_label", `${path}.label`);

  const type = FIELD_TYPES.find((t) => t === raw.type);
  if (type === undefined) {
    bad("bad_field_type", `${path}.type`, typeof raw.type === "string" ? raw.type : undefined);
    return undefined;
  }

  const base = { id, label: label ?? "", required: raw.required === true };
  let field: CustomField;
  switch (type) {
    case "number": {
      const min = optionalNumber(raw.min);
      const max = optionalNumber(raw.max);
      const step = optionalNumber(raw.step);
      if (min === null) bad("bad_number", `${path}.min`);
      if (max === null) bad("bad_number", `${path}.max`);
      if (step === null || (step !== undefined && step <= 0)) bad("bad_number", `${path}.step`);
      if (typeof min === "number" && typeof max === "number" && min > max) bad("bad_number", `${path}.min`);
      field = { ...base, type };
      if (typeof raw.unit === "string" && raw.unit !== "") field.unit = raw.unit;
      if (typeof min === "number") field.min = min;
      if (typeof max === "number") field.max = max;
      if (typeof step === "number" && step > 0) field.step = step;
      break;
    }
    case "scale": {
      const levels = raw.levels === undefined ? DEFAULT_LEVELS : raw.levels;
      if (typeof levels !== "number" || !Number.isInteger(levels) || levels < MIN_LEVELS || levels > MAX_LEVELS) {
        bad("bad_levels", `${path}.levels`);
      }
      field = { ...base, type, levels: typeof levels === "number" ? levels : DEFAULT_LEVELS };
      const low = readText(raw.lowLabel);
      const high = readText(raw.highLabel);
      if (low !== undefined) field.lowLabel = low;
      if (high !== undefined) field.highLabel = high;
      break;
    }
    case "choice":
    case "multiChoice": {
      const options: ChoiceOption[] = [];
      if (!Array.isArray(raw.options) || raw.options.length === 0) {
        bad("no_options", `${path}.options`);
      } else {
        const seenOptions = new Set<string>();
        raw.options.forEach((o, j) => {
          const op = `${path}.options[${j}]`;
          const rawId = isRecord(o) && typeof o.id === "string" ? o.id : undefined;
          const oid = rawId ?? "";
          if (!FIELD_ID.test(oid)) bad("bad_option_id", `${op}.id`, rawId);
          else if (seenOptions.has(oid)) bad("duplicate_option_id", `${op}.id`, oid);
          else seenOptions.add(oid);
          const olabel = isRecord(o) ? readText(o.label) : undefined;
          if (olabel === undefined) bad("missing_label", `${op}.label`);
          else options.push({ id: oid, label: olabel });
        });
      }
      field = { ...base, type, options };
      break;
    }
    default:
      field = { ...base, type };
  }
  return ok ? field : undefined;
}

export type DefinitionDiff = { added: string[]; removed: string[]; typeChanged: string[] };

export function diffDefinitions(prev: CustomRecordDefinition, next: CustomRecordDefinition): DefinitionDiff {
  const before = new Map(prev.fields.map((f) => [f.id, f.type]));
  const after = new Map(next.fields.map((f) => [f.id, f.type]));
  return {
    added: [...after.keys()].filter((k) => !before.has(k)),
    removed: [...before.keys()].filter((k) => !after.has(k)),
    typeChanged: [...after.keys()].filter((k) => before.has(k) && before.get(k) !== after.get(k)),
  };
}
