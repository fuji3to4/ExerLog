import type { useTranslation } from "@/features/i18n/use-translation";
import { resolveText } from "./custom/definition";
import type { RecordModule, RecordModuleData } from "./types";

type T = ReturnType<typeof useTranslation>["t"];

export function moduleLabel(module: RecordModule, t: T, language: string): string {
  const { naming } = module;
  return naming.kind === "keys" ? t(naming.labelKey) : resolveText(naming.label, language);
}

export function moduleDescription(module: RecordModule, t: T, language: string): string {
  const { naming } = module;
  return naming.kind === "keys" ? t(naming.descriptionKey) : resolveText(naming.description, language);
}

/** keys: t(editTitleKey). text: t("custom_edit_title", { name: label }). */
export function moduleEditTitle(module: RecordModule, t: T, language: string): string {
  const { naming } = module;
  return naming.kind === "keys"
    ? t(naming.editTitleKey)
    : t("custom_edit_title", { name: resolveText(naming.label, language) });
}

export function csvExportLabel(data: RecordModuleData, t: T, language: string): string {
  const { exportLabel } = data.csv;
  return "key" in exportLabel ? t(exportLabel.key) : resolveText(exportLabel.text, language);
}

/** The module's icon: a lucide icon in the module color, or the emoji of a custom module. */
export function ModuleIcon({ module, className }: { module: RecordModule; className?: string }) {
  const { naming } = module;
  if (naming.kind === "text") {
    return (
      <span aria-hidden="true" className={className}>
        {naming.emoji}
      </span>
    );
  }
  const Icon = naming.icon;
  return <Icon aria-hidden className={className} style={{ color: module.color }} />;
}
