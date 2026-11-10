import { describe, expect, it } from "vitest";

import type { CustomRecord } from "@/lib/types";
import { parseDefinition, type CustomRecordDefinition } from "./definition";
import { coerceValue, decodeCell, encodeCell, formatRecordLine, normalizeValues } from "./values";

const parsed = parseDefinition({
  exerlogRecordType: 1,
  id: "protein",
  name: "プロテイン",
  fields: [
    { id: "amount", label: "量", type: "number", unit: "g" },
    { id: "kind", label: "種類", type: "choice", options: [{ id: "whey", label: "ホエイ" }, { id: "soy", label: "ソイ" }] },
    { id: "timing", label: "タイミング", type: "multiChoice", options: [{ id: "wake", label: "起床時" }, { id: "post", label: "トレ後" }] },
    { id: "fasted", label: "空腹時", type: "boolean" },
    { id: "brand", label: "銘柄", type: "text" },
    { id: "taste", label: "おいしさ", type: "scale", levels: 5 },
  ],
});
if (!parsed.ok) throw new Error("fixture");
const def: CustomRecordDefinition = parsed.definition;
const field = (id: string) => def.fields.find((f) => f.id === id);

describe("cells", () => {
  it("round-trips every field type", () => {
    const cases: [string, Parameters<typeof encodeCell>[0]][] = [
      ["amount", 30],
      ["taste", 3],
      ["kind", "whey"],
      ["timing", ["wake", "post"]],
      ["fasted", true],
      ["fasted", false],
      ["brand", "X, Y"],
    ];
    for (const [id, value] of cases) expect(decodeCell(field(id), encodeCell(value))).toEqual(value);
  });

  it("handles removed fields and empty cells", () => {
    expect(decodeCell(undefined, "abc")).toBe("abc");
    expect(decodeCell(field("amount"), "")).toBeUndefined();
    expect(decodeCell(field("amount"), "abc")).toBeUndefined();
    expect(decodeCell(field("fasted"), "x")).toBeUndefined();
    expect(encodeCell(undefined)).toBe("");
  });
});

describe("coerceValue", () => {
  it("decodes sheet strings for non-string types", () => {
    expect(coerceValue(field("amount")!, "30")).toBe(30);
    expect(coerceValue(field("amount")!, " 30 ")).toBe(30);
    expect(coerceValue(field("taste")!, "3")).toBe(3);
    expect(coerceValue(field("timing")!, "wake|post")).toEqual(["wake", "post"]);
    expect(coerceValue(field("fasted")!, "1")).toBe(true);
    expect(coerceValue(field("fasted")!, "0")).toBe(false);
  });

  it("passes through values that already fit", () => {
    expect(coerceValue(field("amount")!, 30)).toBe(30);
    expect(coerceValue(field("timing")!, ["post"])).toEqual(["post"]);
    expect(coerceValue(field("fasted")!, false)).toBe(false);
    expect(coerceValue(field("kind")!, "whey")).toBe("whey");
    expect(coerceValue(field("brand")!, "X")).toBe("X");
  });

  it("returns undefined for values that do not fit", () => {
    expect(coerceValue(field("amount")!, undefined)).toBeUndefined();
    expect(coerceValue(field("amount")!, "abc")).toBeUndefined();
    expect(coerceValue(field("amount")!, "  ")).toBeUndefined();
    expect(coerceValue(field("amount")!, true)).toBeUndefined();
    expect(coerceValue(field("amount")!, ["1"])).toBeUndefined();
    expect(coerceValue(field("fasted")!, "x")).toBeUndefined();
    expect(coerceValue(field("fasted")!, 1)).toBeUndefined();
    expect(coerceValue(field("brand")!, 30)).toBeUndefined();
    expect(coerceValue(field("brand")!, ["a"])).toBeUndefined();
    expect(coerceValue(field("kind")!, ["whey"])).toBeUndefined();
    expect(coerceValue(field("timing")!, [])).toBeUndefined();
    expect(coerceValue(field("timing")!, 3)).toBeUndefined();
  });
});

describe("normalizeValues", () => {
  it("coerces numbers, drops empties, keeps unknown ids", () => {
    expect(
      normalizeValues(def, { amount: "30", kind: "", timing: [], taste: NaN, brand: "", old: "x", fasted: false }),
    ).toEqual({ amount: 30, old: "x", fasted: false });
  });

  it("decodes sheet strings for restored multiChoice and boolean fields", () => {
    expect(normalizeValues(def, { timing: "wake|post", fasted: "1" })).toEqual({ timing: ["wake", "post"], fasted: true });
  });
});

describe("formatRecordLine", () => {
  const record = (values: CustomRecord["values"]): CustomRecord => ({
    id: "1",
    typeId: "protein",
    date: "2026-10-05",
    recordedAt: "",
    values,
    note: "",
    updatedAt: "",
  });

  it("joins values in definition order", () => {
    const r = record({ amount: 30, kind: "whey", timing: ["post"], fasted: false });
    expect(formatRecordLine(def, r, "ja", "・")).toBe("30 g・ホエイ・トレ後");
  });

  it("shows unknown option ids as-is, labels for scale and true booleans", () => {
    const r = record({ kind: "casein", fasted: true, taste: 3, timing: ["wake", "post"], gone: "z" });
    expect(formatRecordLine(def, r, "ja", "・")).toBe("casein・起床時、トレ後・空腹時・おいしさ 3/5");
    expect(formatRecordLine(def, r, "en", " · ")).toContain("起床時, トレ後");
  });

  it("decodes raw sheet strings of restored fields and skips values that do not fit", () => {
    const r = record({ amount: "30", timing: "wake|post", fasted: "1", taste: "x" });
    expect(formatRecordLine(def, r, "ja", "・")).toBe("30 g・起床時、トレ後・空腹時");
  });
});
