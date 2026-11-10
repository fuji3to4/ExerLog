"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/features/i18n/use-translation";
import { parseDefinitionText, resolveText, type DefinitionError } from "../definition";
import { getCustomTypes, planImport, saveImportedDefinition, type ImportPlan } from "../type-store";

type Checked = { errors: DefinitionError[] } | { plan: ImportPlan };

function ImportBody({ onDone }: { onDone(): void }) {
  const { t, language } = useTranslation();
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<Checked | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function edit(next: string) {
    setText(next);
    setChecked(null);
    setMessage(null);
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    try {
      edit(await file.text());
    } catch {
      setMessage(t("custom_import_read_failed"));
    }
  }

  async function check() {
    const parsed = parseDefinitionText(text);
    if (!parsed.ok) {
      setChecked({ errors: parsed.errors });
      return;
    }
    setMessage(null);
    try {
      const planned = await planImport(parsed.definition);
      setChecked(planned.ok ? { plan: planned.plan } : { errors: planned.errors });
    } catch {
      setMessage(t("custom_save_failed"));
    }
  }

  async function save(plan: ImportPlan) {
    setMessage(null);
    try {
      await saveImportedDefinition(plan.definition);
    } catch {
      setMessage(t("custom_save_failed"));
      return;
    }
    onDone();
  }

  const errorLines =
    checked && "errors" in checked
      ? checked.errors.map((error) =>
          t(`custom_def_error_${error.code}` as const, {
            path: error.path,
            value: error.value ?? t("custom_def_value_none"),
          }),
        )
      : [];

  async function copyErrors() {
    try {
      await navigator.clipboard.writeText(errorLines.join("\n"));
    } catch {
      // The errors are on screen; copying is a convenience only.
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("custom_import_title")}</DialogTitle>
        <DialogDescription>{t("custom_import_hint")}</DialogDescription>
      </DialogHeader>
      <div className="grid max-h-[65vh] gap-3 overflow-y-auto">
        <label className="text-sm font-medium">
          {t("custom_import_file")}
          <input
            type="file"
            accept="application/json,.json"
            className="mt-1 block w-full text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Reset so picking the same file again (after fixing it) fires onChange.
              event.target.value = "";
              void chooseFile(file);
            }}
          />
        </label>
        <Textarea
          aria-label={t("custom_import_paste_label")}
          value={text}
          onChange={(event) => edit(event.target.value)}
          className="font-mono text-xs"
          spellCheck={false}
        />
        {message ? <p className="text-sm text-[var(--danger-text)]">{message}</p> : null}

        {checked && "errors" in checked ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-[var(--danger-text)]">{t("custom_import_errors_heading")}</p>
            <ul className="grid gap-1 text-sm">
              {errorLines.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
            <div>
              <Button variant="secondary" onClick={() => void copyErrors()}>
                {t("custom_import_copy_errors")}
              </Button>
            </div>
          </div>
        ) : null}

        {checked && "plan" in checked ? <PlanPreview plan={checked.plan} language={language} /> : null}
      </div>
      <div className="flex justify-end gap-2">
        {checked && "plan" in checked ? (
          <Button onClick={() => void save(checked.plan)}>{t("custom_import_do")}</Button>
        ) : (
          <Button disabled={text.trim() === ""} onClick={() => void check()}>
            {t("custom_import_check")}
          </Button>
        )}
      </div>
    </>
  );
}

function PlanPreview({ plan, language }: { plan: ImportPlan; language: string }) {
  const { t } = useTranslation();
  const { definition, diff } = plan;
  const stored = getCustomTypes().find((type) => type.id === definition.id)?.definition;
  const removed = (diff?.removed ?? []).map((id) => {
    const field = stored?.fields.find((f) => f.id === id);
    return { id, label: field ? resolveText(field.label, language) || id : id };
  });
  const pill = "ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground";

  return (
    <div className="grid gap-2 rounded-2xl border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--tonal-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--tonal-text)]">
          {t(`custom_import_kind_${plan.kind}` as const)}
        </span>
        <span className="text-base font-semibold">
          {definition.icon} {resolveText(definition.name, language)}
        </span>
      </div>
      <p className="text-xs font-medium text-muted-foreground">{t("custom_import_fields_heading")}</p>
      <ul className="grid gap-1 text-sm">
        {definition.fields.map((field) => (
          <li key={field.id}>
            <span>{resolveText(field.label, language)}</span>
            {diff?.added.includes(field.id) ? <span className={pill}>{t("custom_import_field_added")}</span> : null}
          </li>
        ))}
        {removed.map((field) => (
          <li key={field.id} className="text-muted-foreground">
            <span>{field.label}</span>
            <span className={pill}>{t("custom_import_field_removed")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ImportDefinitionDialog({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ImportBody onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
