import { useTranslation } from "@/features/i18n/use-translation";
import { toDayKey } from "@/lib/date/day-key";

/** Shown while browsing for a past day, so it's clear where the log will land. Hidden for today. */
export function LogDateNotice({ logDate }: { logDate: string | null }) {
  const { t, formatDate } = useTranslation();
  if (!logDate || logDate === toDayKey(new Date())) return null;
  return (
    <p className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium" role="status">
      {t("log_for_day_notice", { date: formatDate(logDate) })}
    </p>
  );
}
