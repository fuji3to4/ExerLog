"use client";

import { useEffect, useState } from "react";

import { sortByTime } from "@/features/history/components/metric-graph-view";
import { useTranslation } from "@/features/i18n/use-translation";
import { calculateBmi } from "@/features/metrics/bmi";
import { appDb } from "@/features/storage/app-db";
import type { CustomRecord, CustomValue } from "@/lib/types";
import { builtinDefinition, lockedFieldErrors } from "./builtin";
import type { CustomFormExtraProps } from "./custom-form";
import type { CustomModuleExtras } from "./module";
import { getCustomTypes } from "./type-store";
import { coerceValue } from "./values";

const definition = builtinDefinition("body");

function numberOf(fieldId: "weight" | "height", value: CustomValue | undefined): number | undefined {
  const field = definition.fields.find((f) => f.id === fieldId);
  if (!field) return undefined;
  const coerced = coerceValue(field, value);
  return typeof coerced === "number" ? coerced : undefined;
}

/**
 * A synced or hand-edited body definition may lack the kg/cm weight and height the BMI
 * assumes; then no BMI is shown rather than a wrong one.
 */
function bmiAvailable(): boolean {
  const current = getCustomTypes().find((t) => t.id === "body")?.definition ?? definition;
  return lockedFieldErrors(current).length === 0;
}

/** Every stored body record, oldest instant first. */
async function loadBodyRecords(): Promise<CustomRecord[]> {
  const records = await appDb.customRecords.where("typeId").equals("body").toArray();
  return records.sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
}

/** The height typed at `recordedAt`, else the latest height recorded at or before it. */
function heightAt(
  own: number | undefined,
  recordedAt: string,
  history: readonly CustomRecord[],
  excludeId?: string,
): number | undefined {
  if (own !== undefined) return own;
  const at = Date.parse(recordedAt);
  let found: number | undefined;
  for (const record of history) {
    if (record.id === excludeId) continue;
    if (Date.parse(record.recordedAt) > at) break;
    const height = numberOf("height", record.values.height);
    if (height !== undefined) found = height;
  }
  return found;
}

/** BMI of one record, or null without a weight or any usable height. */
function bmiOf(record: CustomRecord, history: readonly CustomRecord[]): number | null {
  const weight = numberOf("weight", record.values.weight);
  if (weight === undefined) return null;
  const height = heightAt(numberOf("height", record.values.height), record.recordedAt, history, record.id);
  return height === undefined ? null : calculateBmi(weight, height);
}

function BmiLine({ weight, height, recordedAt, recordId }: {
  weight: number | undefined;
  height: number | undefined;
  recordedAt: string;
  recordId?: string;
}) {
  const { t } = useTranslation();
  const [stored, setStored] = useState<number | undefined | null>(null);
  const needsLookup = weight !== undefined && height === undefined;

  useEffect(() => {
    if (!needsLookup) return;
    let isActive = true;
    void loadBodyRecords().then((history) => {
      if (isActive) setStored(heightAt(undefined, recordedAt, history, recordId));
    });
    return () => {
      isActive = false;
    };
  }, [needsLookup, recordedAt, recordId]);

  if (weight === undefined || !bmiAvailable()) return null;
  const resolved = height ?? (stored === null ? undefined : stored);
  if (height === undefined && stored === null) return null; // still looking up
  const bmi = resolved === undefined ? null : calculateBmi(weight, resolved);
  return (
    <p className="text-sm text-muted-foreground">
      {bmi === null ? t("bmi_need_height") : t("bmi_value", { value: bmi.toFixed(1) })}
    </p>
  );
}

function BodyFormExtra({ values, recordedAt, recordId }: CustomFormExtraProps) {
  return (
    <BmiLine
      weight={numberOf("weight", values.weight)}
      height={numberOf("height", values.height)}
      recordedAt={recordedAt}
      recordId={recordId}
    />
  );
}

function BodySummaryExtra({ records }: { records: CustomRecord[] }) {
  const { t } = useTranslation();
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;
    void loadBodyRecords().then((history) => {
      const withWeight = records
        .filter((r) => numberOf("weight", r.values.weight) !== undefined)
        .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
      const last = withWeight[withWeight.length - 1];
      if (isActive) setBmi(last && bmiAvailable() ? bmiOf(last, history) : null);
    });
    return () => {
      isActive = false;
    };
  }, [records]);

  return bmi === null ? null : <p>{t("bmi_value", { value: bmi.toFixed(1) })}</p>;
}

export const bodyExtras: CustomModuleExtras = {
  graphMetrics: () => [
    {
      key: "bmi",
      labelKey: "history_graph_metric_bmi",
      async load(range) {
        if (!bmiAvailable()) return { unit: "", decimals: 1, points: [] };
        const history = await loadBodyRecords();
        const points = history
          .filter((r) => r.date >= range.start && r.date <= range.end)
          .flatMap((r) => {
            const bmi = bmiOf(r, history);
            return bmi === null ? [] : [{ at: r.recordedAt, value: bmi }];
          });
        return { unit: "", decimals: 1, points: sortByTime(points) };
      },
    },
  ],
  FormExtra: BodyFormExtra,
  SummaryExtra: BodySummaryExtra,
};
