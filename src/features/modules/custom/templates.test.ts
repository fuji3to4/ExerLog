import { describe, expect, it } from "vitest";

import { en } from "@/features/i18n/messages/en";
import { ja } from "@/features/i18n/messages/ja";
import { parseDefinition } from "./definition";
import { builtInTemplate } from "./templates";

describe("builtInTemplate", () => {
  it("offers templates for wellness and selfcare only", () => {
    expect(builtInTemplate("wellness")).toBeDefined();
    expect(builtInTemplate("selfcare")).toBeDefined();
    for (const id of ["body", "girth", "circumference", "photo", "compression", "symptoms", "custom:protein"]) {
      expect(builtInTemplate(id)).toBeUndefined();
    }
  });

  it("produces definitions the importer accepts unchanged", () => {
    for (const id of ["wellness", "selfcare"]) {
      const template = builtInTemplate(id)!;
      const parsed = parseDefinition(JSON.parse(JSON.stringify(template)));
      expect(parsed).toEqual({ ok: true, definition: template });
    }
  });

  it("describes wellness as two required 1-5 scores named in both languages", () => {
    const template = builtInTemplate("wellness")!;
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

  it("describes selfcare as a required item choice and optional minutes", () => {
    const template = builtInTemplate("selfcare")!;
    expect(template.id).toBe("selfcare");
    expect(template.fields.map((f) => [f.id, f.type, f.required])).toEqual([
      ["item", "choice", true],
      ["minutes", "number", false],
    ]);
    const item = template.fields[0];
    expect(item.type === "choice" && item.options.map((o) => o.id)).toEqual(["skincare", "exercise", "other"]);
    expect(item.type === "choice" && item.options[1].label).toEqual({
      ja: ja.selfcare_item_exercise,
      en: en.selfcare_item_exercise,
    });
  });
});
