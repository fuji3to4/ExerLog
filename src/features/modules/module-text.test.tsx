import { render } from "@testing-library/react";
import { Scale } from "lucide-react";
import { describe, expect, it } from "vitest";

import { getMessages } from "@/features/i18n/messages";
import type { RecordModule } from "./types";
import { ModuleIcon, moduleEditTitle, moduleLabel } from "./module-text";

const ja = getMessages("ja");
const t = ((key: keyof typeof ja, replacements?: Record<string, string | number>) => {
  let message: string = ja[key];
  for (const [name, value] of Object.entries(replacements ?? {})) message = message.replaceAll(`{${name}}`, String(value));
  return message;
}) as Parameters<typeof moduleLabel>[1];

const keysModule = {
  color: "#7a4fb0",
  naming: {
    kind: "keys",
    labelKey: "module_body_label",
    descriptionKey: "module_body_description",
    editTitleKey: "body_edit_title",
    icon: Scale,
  },
} as unknown as RecordModule;

const textModule = {
  color: "#5f9e7a",
  naming: { kind: "text", label: { ja: "プロテイン", en: "Protein" }, emoji: "🥤" },
} as unknown as RecordModule;

describe("moduleLabel", () => {
  it("returns the translated key for a keys module", () => {
    expect(moduleLabel(keysModule, t, "ja")).toBe(ja.module_body_label);
  });

  it("returns the text of the display language for a text module", () => {
    expect(moduleLabel(textModule, t, "ja")).toBe("プロテイン");
    expect(moduleLabel(textModule, t, "en")).toBe("Protein");
  });
});

describe("moduleEditTitle", () => {
  it("names the module in the edit title of a text module", () => {
    expect(moduleEditTitle(textModule, t, "ja")).toBe("「プロテイン」を編集");
  });

  it("uses the editTitleKey of a keys module", () => {
    expect(moduleEditTitle(keysModule, t, "ja")).toBe(ja.body_edit_title);
  });
});

describe("ModuleIcon", () => {
  it("draws the emoji of a text module in an aria-hidden span", () => {
    const { container } = render(<ModuleIcon module={textModule} />);
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("🥤");
    expect(span?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws the lucide icon of a keys module in the module color", () => {
    const { container } = render(<ModuleIcon module={keysModule} className="h-5 w-5" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.style.color).toBe("rgb(122, 79, 176)");
    expect(svg?.getAttribute("class")).toContain("h-5");
  });
});
