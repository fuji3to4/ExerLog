import { describe, expect, it } from "vitest";

import type { CustomRecordDefinition } from "./definition";
import {
  DEFAULT_ICON,
  defaultColor,
  diffDefinitions,
  parseDefinition,
  parseDefinitionText,
  resolveText,
} from "./definition";

const SAMPLE = {
  exerlogRecordType: 1,
  id: "protein",
  name: "プロテイン",
  icon: "🥤",
  color: "#5f9e7a",
  description: "量・種類・タイミング",
  fields: [
    { id: "amount", label: "量", type: "number", unit: "g", min: 0, max: 200, step: 1, required: true },
    { id: "kind", label: "種類", type: "choice", options: [{ id: "whey", label: "ホエイ" }, { id: "soy", label: "ソイ" }] },
    { id: "timing", label: "タイミング", type: "multiChoice", options: [{ id: "wake", label: "起床時" }, { id: "post", label: "トレ後" }] },
    { id: "fasted", label: "空腹時", type: "boolean" },
    { id: "brand", label: "銘柄", type: "text" },
    { id: "taste", label: "おいしさ", type: "scale", levels: 5, lowLabel: "いまいち", highLabel: "おいしい" },
  ],
};

function errorsOf(input: unknown) {
  const result = parseDefinition(input);
  if (result.ok) throw new Error("expected failure");
  return result.errors;
}

describe("parseDefinitionText", () => {
  it("accepts the protein sample", () => {
    const result = parseDefinitionText(JSON.stringify(SAMPLE));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fields = result.definition.fields;
    expect(fields[0].required).toBe(true);
    expect(fields[1].required).toBe(false);
    expect(fields[5]).toMatchObject({ type: "scale", levels: 5 });
  });

  it("fills defaults", () => {
    const { icon: _i, color: _c, ...rest } = SAMPLE;
    const result = parseDefinition(rest);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.definition.icon).toBe(DEFAULT_ICON);
    expect(result.definition.icon).toBe("📝");
    expect(result.definition.color).toBe(defaultColor("protein"));
    expect(result.definition.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("defaults scale levels to 5 and version to 1 when omitted", () => {
    const result = parseDefinition({ id: "x", name: "X", fields: [{ id: "s", label: "S", type: "scale" }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.definition.exerlogRecordType).toBe(1);
    expect(result.definition.fields[0]).toMatchObject({ type: "scale", levels: 5 });
  });

  it("accepts JSON wrapped in a code fence or prose", () => {
    const text = `はい、どうぞ。\n\`\`\`json\n${JSON.stringify(SAMPLE, null, 2)}\n\`\`\`\n使ってください`;
    expect(parseDefinitionText(text).ok).toBe(true);
  });

  it("returns not_json and not_object", () => {
    expect(parseDefinitionText("hello")).toEqual({ ok: false, errors: [{ code: "not_json", path: "" }] });
    expect(parseDefinitionText("[1]")).toEqual({ ok: false, errors: [{ code: "not_object", path: "" }] });
  });
});

describe("parseDefinition", () => {
  it("reports every problem with a path", () => {
    const errors = errorsOf({
      id: "Protein!",
      name: "P",
      fields: [
        { id: "note", type: "number", label: "x" },
        { id: "a", type: "choice", label: "x", options: [] },
        { id: "b", type: "date", label: "x" },
      ],
    });
    expect(errors).toContainEqual({ code: "bad_id", path: "id" });
    expect(errors).toContainEqual({ code: "reserved_field_id", path: "fields[0].id" });
    expect(errors).toContainEqual({ code: "no_options", path: "fields[1].options" });
    expect(errors).toContainEqual({ code: "bad_field_type", path: "fields[2].type", value: "date" });
  });

  it("reports missing name, missing fields, bad ids and missing labels", () => {
    expect(errorsOf({ id: "x", fields: [] }).map((e) => e.code)).toEqual(
      expect.arrayContaining(["missing_name", "no_fields"]),
    );
    const errors = errorsOf({
      id: "x",
      name: "X",
      fields: [
        { id: "1bad", type: "text", label: "a" },
        { id: "ok", type: "text" },
        { id: "c", type: "choice", label: "c", options: [{ id: "!", label: "a" }] },
      ],
    });
    expect(errors).toContainEqual({ code: "bad_field_id", path: "fields[0].id", value: "1bad" });
    expect(errors).toContainEqual({ code: "missing_label", path: "fields[1].label" });
    expect(errors).toContainEqual({ code: "bad_option_id", path: "fields[2].options[0].id", value: "!" });
  });

  it("rejects duplicates", () => {
    const errors = errorsOf({
      id: "x",
      name: "X",
      fields: [
        { id: "a", type: "text", label: "a" },
        { id: "a", type: "text", label: "a" },
        { id: "c", type: "choice", label: "c", options: [{ id: "o", label: "1" }, { id: "o", label: "2" }] },
      ],
    });
    expect(errors).toContainEqual({ code: "duplicate_field_id", path: "fields[1].id", value: "a" });
    expect(errors).toContainEqual({ code: "duplicate_option_id", path: "fields[2].options[1].id", value: "o" });
  });

  it("rejects bad numbers", () => {
    const errors = errorsOf({
      id: "x",
      name: "X",
      fields: [
        { id: "n", type: "number", label: "n", min: 5, max: 1 },
        { id: "s", type: "scale", label: "s", levels: 11 },
      ],
    });
    expect(errors.map((e) => e.code)).toEqual(expect.arrayContaining(["bad_number", "bad_levels"]));
    expect(errors).toContainEqual({ code: "bad_levels", path: "fields[1].levels" });
  });

  it("rejects unsupported version", () => {
    expect(errorsOf({ ...SAMPLE, exerlogRecordType: 2 })).toContainEqual({
      code: "unsupported_version",
      path: "exerlogRecordType",
      value: "2",
    });
  });
});

function def(fields: unknown[]): CustomRecordDefinition {
  const result = parseDefinition({ id: "x", name: "X", fields });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.definition;
}

describe("diffDefinitions", () => {
  it("reports added, removed and type-changed fields", () => {
    const opts = [{ id: "a", label: "A" }];
    const prev = def([
      { id: "amount", label: "a", type: "number" },
      { id: "brand", label: "b", type: "text" },
    ]);
    const next = def([
      { id: "amount", label: "a", type: "choice", options: opts },
      { id: "memo", label: "m", type: "text" },
    ]);
    expect(diffDefinitions(prev, next)).toEqual({ added: ["memo"], removed: ["brand"], typeChanged: ["amount"] });
  });

  it("treats choice to multiChoice as a type change", () => {
    const opts = [{ id: "a", label: "A" }];
    const prev = def([{ id: "k", label: "k", type: "choice", options: opts }]);
    const next = def([{ id: "k", label: "k", type: "multiChoice", options: opts }]);
    expect(diffDefinitions(prev, next).typeChanged).toEqual(["k"]);
  });
});

describe("resolveText", () => {
  it("picks the language, falls back to the first value, and handles plain/undefined", () => {
    expect(resolveText({ en: "Protein", ja: "プロテイン" }, "ja")).toBe("プロテイン");
    expect(resolveText({ en: "Protein" }, "ja")).toBe("Protein");
    expect(resolveText("量", "en")).toBe("量");
    expect(resolveText(undefined, "ja")).toBe("");
  });
});
