import { describe, expect, it } from "vitest";

import { en } from "@/features/i18n/messages/en";
import { ja } from "@/features/i18n/messages/ja";
import { parseDefinition, type CustomRecordDefinition } from "./definition";
import {
  BUILTIN_IDS,
  BUILTIN_SEED_UPDATED_AT,
  KNOWN_SEED_UPDATED_ATS,
  builtinDefinition,
  builtinTags,
  isBuiltinId,
  isDefaultDefinition,
  lockedFieldErrors,
} from "./builtin";

function clone(id: "wellness" | "body" | "selfcare" | "girth"): CustomRecordDefinition {
  return JSON.parse(JSON.stringify(builtinDefinition(id)));
}

describe("builtin definitions", () => {
  it("round-trips every built-in through parseDefinition unchanged", () => {
    for (const id of BUILTIN_IDS) {
      const definition = builtinDefinition(id);
      expect(parseDefinition(JSON.parse(JSON.stringify(definition)))).toEqual({ ok: true, definition });
    }
  });

  it("describes body and girth fields", () => {
    const body = builtinDefinition("body");
    expect(body.name).toEqual({ ja: ja.module_body_label, en: en.module_body_label });
    expect(body.fields.map((f) => [f.id, f.type, f.type === "number" ? f.unit : undefined])).toEqual([
      ["weight", "number", "kg"],
      ["bodyFat", "number", "%"],
      ["height", "number", "cm"],
    ]);
    expect(builtinDefinition("girth").fields.map((f) => [f.id, f.type, f.type === "number" ? f.unit : undefined])).toEqual([
      ["chest", "number", "cm"],
      ["waist", "number", "cm"],
    ]);
  });

  it("tags only selfcare", () => {
    expect(builtinTags("selfcare")).toEqual(["lymphedema"]);
    expect(builtinTags("wellness")).toBeUndefined();
  });

  it("recognizes built-in ids", () => {
    expect(isBuiltinId("custom:wellness")).toBe(false);
    expect(isBuiltinId("girth")).toBe(true);
  });

  it("exposes the seed timestamp", () => {
    expect(BUILTIN_SEED_UPDATED_AT).toBe("2000-01-02T00:00:00+00:00");
    expect(KNOWN_SEED_UPDATED_ATS).toEqual(["2000-01-01T00:00:00+00:00", "2000-01-02T00:00:00+00:00"]);
  });

  describe("lockedFieldErrors", () => {
    it("flags a removed height", () => {
      const d = clone("body");
      d.fields = d.fields.filter((f) => f.id !== "height");
      expect(lockedFieldErrors(d)).toEqual([{ code: "locked_field", path: "fields.height" }]);
    });

    it("flags a changed weight unit or type", () => {
      const lb = clone("body");
      const w = lb.fields.find((f) => f.id === "weight")!;
      if (w.type === "number") w.unit = "lb";
      expect(lockedFieldErrors(lb)).toEqual([{ code: "locked_field", path: "fields.weight" }]);

      const text = clone("body");
      text.fields = text.fields.map((f) => (f.id === "weight" ? { id: "weight", label: f.label, required: false, type: "text" } : f));
      expect(lockedFieldErrors(text)).toEqual([{ code: "locked_field", path: "fields.weight" }]);
    });

    it("allows other edits on body and anything on other definitions", () => {
      const d = clone("body");
      d.fields = d.fields.filter((f) => f.id !== "bodyFat");
      expect(lockedFieldErrors(d)).toEqual([]);

      const e = clone("body");
      e.fields = e.fields.map((f) => (f.id === "weight" && f.type === "number" ? { ...f, label: "Mass", max: 400 } : f));
      expect(lockedFieldErrors(e)).toEqual([]);

      const w = clone("wellness");
      w.fields = [];
      expect(lockedFieldErrors(w)).toEqual([]);
    });
  });

  describe("isDefaultDefinition", () => {
    it("compares deeply", () => {
      expect(isDefaultDefinition("girth", builtinDefinition("girth"))).toBe(true);
      const d = clone("girth");
      const waist = d.fields.find((f) => f.id === "waist");
      if (waist?.type === "number") waist.max = 100;
      expect(isDefaultDefinition("girth", d)).toBe(false);
    });
  });

  it("describes wellness as two required 1-5 scores named in both languages", () => {
    const template = builtinDefinition("wellness");
    expect(template.id).toBe("wellness");
    expect(template.name).toEqual({ ja: ja.module_wellness_label, en: en.module_wellness_label });
    expect(template.fields.map((f) => [f.id, f.type, f.required])).toEqual([
      ["physical", "scale", true],
      ["mental", "scale", true],
    ]);
    const physical = template.fields[0];
    expect(physical.type === "scale" && physical.levels).toBe(5);
    expect(physical.type === "scale" && physical.lowLabel).toEqual({
      ja: ja.wellness_score_hint_low,
      en: en.wellness_score_hint_low,
    });
  });

  it("selfcare has hasEnd and no minutes field", () => {
    const template = builtinDefinition("selfcare");
    expect(template.hasEnd).toBe(true);
    expect(template.fields.some((f) => f.id === "minutes")).toBe(false);
  });

  it("describes selfcare as a required item choice", () => {
    const template = builtinDefinition("selfcare");
    expect(template.id).toBe("selfcare");
    expect(template.fields.map((f) => [f.id, f.type, f.required])).toEqual([["item", "choice", true]]);
    const item = template.fields[0];
    expect(item.type === "choice" && item.options.map((o) => o.id)).toEqual(["skincare", "exercise", "other"]);
    expect(item.type === "choice" && item.options[1].label).toEqual({
      ja: ja.selfcare_item_exercise,
      en: en.selfcare_item_exercise,
    });
  });
});
