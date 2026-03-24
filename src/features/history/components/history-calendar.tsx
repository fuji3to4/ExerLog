import { buildMonthGrid } from "@/lib/date/month-grid";
import { useTranslation } from "@/features/i18n/use-translation";

type HistoryCalendarProps = {
  month: string;
  completedDays: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

export function HistoryCalendar({ month, completedDays, selectedDate, onSelectDate }: HistoryCalendarProps) {
  const completedDaySet = new Set(completedDays);
  const { language, t } = useTranslation();

  function formatCalendarLabel(date: string, completed: boolean) {
    const locale = language === "ja" ? "ja-JP" : "en-US";
    const label = new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
    }).format(new Date(`${date}T00:00:00`));

    return completed ? t("history_calendar_completed_label", { date: label }) : label;
  }

  return (
    <section className="card history-calendar">
      <div className="history-calendar__header">
        <h2>{t("history_calendar_heading")}</h2>
        <p>{t("history_calendar_text")}</p>
      </div>

      <div className="history-calendar__grid">
        {buildMonthGrid(month).map((day) => {
          const isCompleted = completedDaySet.has(day.date);
          const isSelected = selectedDate === day.date;
          const className = [
            "history-calendar__day",
            isCompleted ? "is-completed" : "",
            isSelected ? "is-selected" : "",
            day.inMonth ? "" : "is-outside-month",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={day.date}
              type="button"
              className={className}
              aria-label={formatCalendarLabel(day.date, isCompleted)}
              onClick={() => onSelectDate(day.date)}
            >
              <span>{day.dayOfMonth}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
