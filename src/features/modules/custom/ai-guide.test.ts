import { describe, expect, it } from "vitest";
import { buildAiGuide, SAMPLE_DEFINITION } from "./ai-guide";
import { parseDefinitionText } from "./definition";

function firstJsonBlock(text: string): string {
  const m = text.match(/```json\n([\s\S]*?)\n```/);
  if (!m) throw new Error("no json block");
  return m[1];
}

describe("buildAiGuide", () => {
  it.each(["ja", "en"] as const)("the sample in the guide is accepted (%s)", (lang) => {
    const result = parseDefinitionText(firstJsonBlock(buildAiGuide(lang)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.definition.id).toBe(SAMPLE_DEFINITION.id);
  });

  it.each(["ja", "en"] as const)("mentions every field type and reserved id (%s)", (lang) => {
    const guide = buildAiGuide(lang);
    for (const word of ["number", "scale", "choice", "multiChoice", "boolean", "text", "id", "date", "recordedAt", "note", "updatedAt"]) {
      expect(guide).toContain(word);
    }
  });

  it("ends with the prompt line", () => {
    expect(buildAiGuide("ja").trimEnd().endsWith("記録したいもの:")).toBe(true);
    expect(buildAiGuide("en").trimEnd().endsWith("What I want to record:")).toBe(true);
  });
});
