"use client";

import { useId, useState } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { TimeField, TimelineDialogFooter, useSaveAndClose } from "@/features/timeline/components/timeline-dialog-parts";
import { localIsoAt, timeOfIso, withLocalTime } from "@/lib/date/local-iso";
import type { BodySite, CellulitisCare, SymptomEntry, SymptomId, SymptomRecord, SymptomSeverity } from "@/lib/types";
import type { RecordFormProps } from "../types";
import { BODY_SITES, hasSeverity, hasSites, SYMPTOMS } from "./columns";
import { addSymptomRecord, deleteSymptomRecord, updateSymptomRecord } from "./data";

const SEVERITIES: readonly SymptomSeverity[] = [1, 2, 3];
const CARES: readonly CellulitisCare[] = ["inpatient", "outpatient", "none"];

const OPTION_CLASS = "h-10 flex-1 rounded-xl border px-2 text-sm";
const optionState = (on: boolean) => (on ? "border-primary bg-primary/10 font-medium" : "border-input");

/** Time, symptoms (with severity / care and sites) and note. Mount it only while its dialog is open. */
export function SymptomsForm({ onOpenChange, date, record, onSaved, onDeleted }: RecordFormProps<SymptomRecord>) {
  const { t } = useTranslation();
  const noteId = useId();
  const [baseAt] = useState(() => record?.recordedAt ?? localIsoAt(date));
  const [time, setTime] = useState(() => timeOfIso(baseAt));
  const [entries, setEntries] = useState<SymptomEntry[]>(() => record?.symptoms ?? []);
  const [note, setNote] = useState(record?.note ?? "");
  const { isSaved, isBusy, hasError, run } = useSaveAndClose();

  function update(id: SymptomId, patch: Partial<SymptomEntry>) {
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function toggleSymptom(id: SymptomId) {
    setEntries((current) =>
      current.some((e) => e.id === id)
        ? current.filter((e) => e.id !== id)
        : [...current, { id, severity: null, sites: [], care: null }],
    );
  }

  function toggleSite(entry: SymptomEntry, site: BodySite) {
    update(entry.id, {
      sites: entry.sites.includes(site) ? entry.sites.filter((s) => s !== site) : [...entry.sites, site],
    });
  }

  function save(symptoms: SymptomEntry[]) {
    const recordedAt = withLocalTime(baseAt, time);
    void run(
      async () => {
        if (!record) return addSymptomRecord({ date, recordedAt, symptoms, note });
        const updated: SymptomRecord = { ...record, recordedAt, symptoms, note };
        await updateSymptomRecord(updated);
        return updated;
      },
      (saved) => {
        onOpenChange(false);
        onSaved(saved);
      },
    );
  }

  async function remove() {
    if (!record) return;
    await deleteSymptomRecord(record.id);
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <div className="space-y-4">
      <TimeField value={time} onChange={setTime} />
      {/* Saves at once; disabled while saving so a quick double tap cannot add two records. */}
      <button
        type="button"
        disabled={entries.length > 0 || isBusy}
        onClick={() => save([])}
        className="h-11 w-full rounded-xl border border-input text-sm disabled:opacity-50"
      >
        {t("symptoms_none")}
      </button>
      <div className="space-y-3">
        {SYMPTOMS.map((id) => {
          const entry = entries.find((e) => e.id === id);
          return (
            <div key={id} className="space-y-2">
              <button
                type="button"
                aria-pressed={entry !== undefined}
                onClick={() => toggleSymptom(id)}
                className={`min-h-11 w-full rounded-xl border px-3 text-left text-sm ${optionState(entry !== undefined)}`}
              >
                {t(`symptom_${id}` as const)}
              </button>
              {entry ? (
                <div className="space-y-2 pl-3">
                  {hasSeverity(id) ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("symptom_severity_label")}</p>
                      <div role="radiogroup" aria-label={t("symptom_severity_label")} className="flex gap-2">
                        {SEVERITIES.map((severity) => (
                          <button
                            key={severity}
                            type="button"
                            role="radio"
                            aria-checked={entry.severity === severity}
                            onClick={() => update(id, { severity: entry.severity === severity ? null : severity })}
                            className={`${OPTION_CLASS} ${optionState(entry.severity === severity)}`}
                          >
                            {t(`symptom_severity_${severity}` as const)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("cellulitis_care_label")}</p>
                      <div role="radiogroup" aria-label={t("cellulitis_care_label")} className="flex gap-2">
                        {CARES.map((care) => (
                          <button
                            key={care}
                            type="button"
                            role="radio"
                            aria-checked={entry.care === care}
                            onClick={() => update(id, { care: entry.care === care ? null : care })}
                            className={`${OPTION_CLASS} ${optionState(entry.care === care)}`}
                          >
                            {t(`cellulitis_care_${care}` as const)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {hasSites(id) ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t("symptom_sites_label")}</p>
                      <div className="flex flex-wrap gap-2">
                        {BODY_SITES.map((site) => (
                          <button
                            key={site}
                            type="button"
                            aria-pressed={entry.sites.includes(site)}
                            onClick={() => toggleSite(entry, site)}
                            className={`h-10 rounded-xl border px-3 text-sm ${optionState(entry.sites.includes(site))}`}
                          >
                            {t(`body_site_${site}` as const)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="text-sm font-medium">
          {t("timeline_note")}
        </label>
        <textarea
          id={noteId}
          rows={2}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <TimelineDialogFooter
        isSaved={isSaved}
        isBusy={isBusy}
        hasError={hasError}
        canSave={time !== "" && (entries.length > 0 || record?.symptoms.length === 0)}
        onSave={() => save(entries)}
        onDelete={record ? remove : undefined}
      />
    </div>
  );
}
