"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/features/i18n/use-translation";
import { useDeletedCustomTypes } from "../../use-module-settings";
import { buildAiGuide } from "../ai-guide";
import { resolveText } from "../definition";
import { countRecordsOfType, markTypeDeleted, purgeType } from "../type-store";
import { CustomTypesHelpDialog } from "./custom-types-help-dialog";
import { ImportDefinitionDialog } from "./import-definition-dialog";

const COPIED_MS = 2000;

/** Settings block under the module list: import definitions, restore or permanently delete deleted ones, copy the AI guide. */
export function CustomTypesSettings() {
  const { t, language } = useTranslation();
  const deleted = useDeletedCustomTypes();
  const [importing, setImporting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fallbackGuide, setFallbackGuide] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  // The row whose permanent delete is being confirmed, with its record count.
  const [purging, setPurging] = useState<{ id: string; count: number } | null>(null);
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

  async function restore(id: string) {
    setSaveFailed(false);
    try {
      await markTypeDeleted(id, false);
    } catch {
      setSaveFailed(true);
    }
  }

  async function askPurge(id: string) {
    setSaveFailed(false);
    try {
      setPurging({ id, count: await countRecordsOfType(id) });
    } catch {
      setSaveFailed(true);
    }
  }

  async function purge(id: string) {
    setSaveFailed(false);
    try {
      await purgeType(id);
      setPurging(null);
    } catch {
      setSaveFailed(true);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setImporting(true)}>{t("custom_import_open")}</Button>
        <Button variant="secondary" onClick={() => void copyGuide()}>
          {t("custom_copy_guide")}
        </Button>
        <button
          type="button"
          aria-label={t("custom_help_open")}
          className="flex size-8 items-center justify-center rounded-full border border-input text-sm font-medium text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
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
            {deleted.map((type) => {
              const name = resolveText(type.definition.name, language);
              return (
                <li key={type.id} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm">
                    {type.definition.icon} {name}
                  </span>
                  <Button variant="secondary" onClick={() => void restore(type.id)}>
                    {t("custom_restore")}
                  </Button>
                  <Button variant="destructive" onClick={() => void askPurge(type.id)}>
                    {t("custom_purge")}
                  </Button>
                  {purging?.id === type.id ? (
                    <div className="bulk-delete-confirm w-full">
                      <p className="bulk-delete-confirm__message">
                        {t("custom_purge_confirm", { name, count: purging.count })}
                      </p>
                      <div className="bulk-delete-confirm__actions">
                        <Button variant="secondary" onClick={() => setPurging(null)}>
                          {t("settings_delete_cancel_btn")}
                        </Button>
                        <Button variant="destructive" onClick={() => void purge(type.id)}>
                          {t("settings_delete_confirm_btn")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {saveFailed ? (
            <p role="alert" className="mt-2 text-sm text-[var(--danger-text)]">
              {t("custom_save_failed")}
            </p>
          ) : null}
        </details>
      ) : null}

      <ImportDefinitionDialog open={importing} onOpenChange={setImporting} />
      <CustomTypesHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
