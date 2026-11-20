import { builtinDefinition, type BuiltinId } from "@/features/modules/custom/builtin";
import { addCustomRecord } from "@/features/modules/custom/data";
import type { CustomRecord, CustomValue } from "@/lib/types";

/** Adds a record of a built-in type (e.g. wellness, body) the way its form would. */
export function addBuiltinRecord(
  id: BuiltinId,
  input: { date: string; recordedAt?: string; values: Record<string, CustomValue>; note?: string },
): Promise<CustomRecord> {
  return addCustomRecord(builtinDefinition(id), {
    date: input.date,
    recordedAt: input.recordedAt ?? `${input.date}T08:00:00+09:00`,
    values: input.values,
    note: input.note ?? "",
  });
}
