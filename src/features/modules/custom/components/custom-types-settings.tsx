"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/features/i18n/use-translation";
import { useDeletedCustomTypes } from "../../use-module-settings";
import { buildAiGuide } from "../ai-guide";
import { resolveText } from "../definition";
import { markTypeDeleted } from "../type-store";
import { ImportDefinitionDialog } from "./import-definition-dialog";

const COPIED_MS = 2000;

/** Settings block under the module list: import definitions, restore deleted ones, copy the AI guide. */
export function CustomTypesSettings() {
  const { t, language } = useTranslation();
  const deleted = useDeletedCustomTypes();
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fallbackGuide, setFallbackGuide] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (fallbackGuide !== null) areaRef.current?.select();
  }, [fallbackGuide]);

  async function copyGuide() {
    const guide = buildAiGuide(language);
    try {
      await navigator.clipboard.writeText(guide);
    } catch {
      // No clipboard (or it refused): show the text so it can be copied by hand.
      setFallbackGuide(guide);
      return;
    }
    setFallbackGuide(null);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setImporting(true)}>{t("custom_import_open")}</Button>
        <Button variant="secondary" onClick={() => void copyGuide()}>
          {t("custom_copy_guide")}
        </Button>
        {copied ? (
          <span role="status" className="text-sm text-muted-foreground">
            {t("custom_copied")}
          </span>
        ) : null}
      </div>
      {fallbackGuide !== null ? (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t("custom_copy_guide_fallback")}</p>
          <Textarea ref={areaRef} readOnly value={fallbackGuide} className="h-40 font-mono text-xs" />
        </div>
      ) : null}

      {deleted.length > 0 ? (
        <details className="group rounded-xl border border-border px-3 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium">
            <ChevronRight aria-hidden className="h-4 w-4 transition-transform group-open:rotate-90" />
            {t("custom_deleted_heading")}
          </summary>
          <ul className="mt-2 space-y-2">
            {deleted.map((type) => (
              <li key={type.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm">
                  {type.definition.icon} {resolveText(type.definition.name, language)}
                </span>
                <Button variant="secondary" onClick={() => void markTypeDeleted(type.id, false)}>
                  {t("custom_restore")}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <ImportDefinitionDialog open={importing} onOpenChange={setImporting} />
    </div>
  );
}
