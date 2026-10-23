import { describe, expect, it } from "vitest";
import { ja } from "@/features/i18n/messages/ja";
import type { Messages } from "@/features/i18n/messages";
import { circumferenceTooltipLines } from "./circumference-graph";

function t(key: keyof Messages, replacements?: Record<string, string | number>): string {
  let message: string = ja[key];
  for (const [placeholder, value] of Object.entries(replacements ?? {})) {
    message = message.replaceAll(`{${placeholder}}`, String(value));
  }
  return message;
}

describe("circumferenceTooltipLines", () => {
  it("lists time, right, left, then the left/right difference", () => {
    expect(
      circumferenceTooltipLines(
        { at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: null }, right: { value: 24.5, delta: 0.3 } },
        t,
      ),
    ).toEqual(["10/20 07:10", "右 24.5cm（前回 +0.3）", "左 22.4cm", "左右差 2.1（右が大きい）"]);
  });

  it("has no difference line when only the left side was recorded", () => {
    expect(
      circumferenceTooltipLines({ at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: -0.2 } }, t),
    ).toEqual(["10/20 07:10", "左 22.4cm（前回 −0.2）"]);
  });

  it("shows an equal difference without naming a side", () => {
    expect(
      circumferenceTooltipLines(
        { at: "2026-10-20T07:10:00+09:00", left: { value: 22.4, delta: null }, right: { value: 22.4, delta: null } },
        t,
      ),
    ).toEqual(["10/20 07:10", "右 22.4cm", "左 22.4cm", "左右差 0.0"]);
  });
});
