import { en } from "@/features/i18n/messages/en";
import { ja } from "@/features/i18n/messages/ja";
import type { Messages } from "@/features/i18n/messages";
import type { CustomRecordDefinition, LocalizedText } from "./definition";

/** The same message in both app languages, so an exported template reads right in either. */
function both(key: keyof Messages): LocalizedText {
  return { ja: ja[key], en: en[key] };
}

const SCORE_HINTS = { lowLabel: both("wellness_score_hint_low"), highLabel: both("wellness_score_hint_high") };

/**
 * Code modules that a custom definition can express, as starting points to copy and customize.
 * Importing one creates a separate custom record type; the code module and its data stay as they are.
 */
const TEMPLATES: Record<string, CustomRecordDefinition> = {
  wellness: {
    exerlogRecordType: 1,
    id: "wellness",
    name: both("module_wellness_label"),
    icon: "🙂",
    color: "#e07a5f",
    description: both("module_wellness_description"),
    fields: [
      { id: "physical", label: both("history_graph_metric_physical"), type: "scale", required: true, levels: 5, ...SCORE_HINTS },
      { id: "mental", label: both("history_graph_metric_mental"), type: "scale", required: true, levels: 5, ...SCORE_HINTS },
    ],
  },
  selfcare: {
    exerlogRecordType: 1,
    id: "selfcare",
    name: both("module_selfcare_label"),
    icon: "🧴",
    color: "#3a9e7e",
    description: both("module_selfcare_description"),
    fields: [
      {
        id: "item",
        label: { ja: "種類", en: "Type" },
        type: "choice",
        required: true,
        options: [
          { id: "skincare", label: both("selfcare_item_skincare") },
          { id: "exercise", label: both("selfcare_item_exercise") },
          { id: "other", label: both("selfcare_item_other") },
        ],
      },
      { id: "minutes", label: { ja: "時間", en: "Duration" }, type: "number", required: false, unit: "分", min: 1, step: 1 },
    ],
  },
};

/** The exportable template for a code module id, or undefined when the module has none. */
export function builtInTemplate(moduleId: string): CustomRecordDefinition | undefined {
  return TEMPLATES[moduleId];
}
