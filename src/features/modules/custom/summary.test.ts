import { describe, expect, it } from "vitest";

import type { CustomRecord } from "@/lib/types";
import { parseDefinition } from "./definition";
import { summarizeCustomRecords } from "./summary";

const parsed = parseDefinition({
  id: "protein",
  name: "p",
  fields: [
    { id: "amount", label: "a", type: "number" },
    { id: "taste", label: "t", type: "scale", levels: 5 },
    {
      id: "kind",
      label: "k",
      type: "choice",
      options: [
        { id: "soy", label: "s" },
        { id: "whey", label: "w" },
      ],
    },
  ],
});
if (!parsed.ok) throw new Error("fixture");
const definition = parsed.definition;

function rec(values: CustomRecord["values"]): CustomRecord {
  return {
    id: crypto.randomUUID(),
    typeId: "protein",
    date: "2026-10-20",
    recordedAt: "2026-10-20T08:00:00+09:00",
    values,
    note: "",
    updatedAt: "",
  };
}

describe("summarizeCustomRecords", () => {
  it("returns null for no records", () => {
    expect(summarizeCustomRecords(definition, [])).toBeNull();
  });

  it("computes avg, min and max for numeric fields and skips fields without values", () => {
    const s = summarizeCustomRecords(definition, [rec({ amount: 20 }), rec({ amount: 30 }), rec({ amount: 40 })]);
    expect(s?.count).toBe(3);
    expect(s?.numeric).toEqual([{ fieldId: "amount", avg: 30, min: 20, max: 40 }]);
  });

  it("counts choices, most frequent first, ties in definition order", () => {
    const s = summarizeCustomRecords(definition, [rec({ kind: "whey" }), rec({ kind: "whey" }), rec({ kind: "soy" })]);
    expect(s?.choices).toEqual([
      {
        fieldId: "kind",
        counts: [
          { optionId: "whey", count: 2 },
          { optionId: "soy", count: 1 },
        ],
      },
    ]);
    const tie = summarizeCustomRecords(definition, [rec({ kind: "whey" }), rec({ kind: "soy" })]);
    expect(tie?.choices[0].counts.map((c) => c.optionId)).toEqual(["soy", "whey"]);
  });
});
