import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMonthGrid } from "@/lib/date/month-grid";
import { useTranslation } from "@/features/i18n/use-translation";

type HistoryCalendarProps = {
  month: string;
  completedDays: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

const WEEKDAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

function getWeekdayLabel(dayIndex: number, locale: string): string {
  const date = new Date(2023, 0, 1 + dayIndex); // Jan 1 2023 is Sunday
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
}

function getMonthLabel(month: string, locale: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(
    new Date(year, m - 1, 1)
  );
}

export function HistoryCalendar({
  month,
  completedDays,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: HistoryCalendarProps) {
  const completedDaySet = new Set(completedDays);
  const { language, t } = useTranslation();
  const locale = language === "ja" ? "ja-JP" : "en-US";

  function formatCalendarLabel(date: string, completed: boolean) {
    const label = new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
    }).format(new Date(`${date}T00:00:00`));

    return completed ? t("history_calendar_completed_label", { date: label }) : label;
  }

  return (
    <Card className="history-calendar">
      <CardHeader>
        <CardTitle>{t("history_calendar_heading")}</CardTitle>
        <p>{t("history_calendar_text")}</p>
      </CardHeader>

      <CardContent>
        <div className="history-calendar__nav">
          <button
            type="button"
            className="history-calendar__nav-btn"
            aria-label={t("history_calendar_prev_month")}
            onClick={onPrevMonth}
          >
            ‹
          </button>
          <span className="history-calendar__month-label">
            {getMonthLabel(month, locale)}
          </span>
          <button
            type="button"
            className="history-calendar__nav-btn"
            aria-label={t("history_calendar_next_month")}
            onClick={onNextMonth}
          >
            ›
          </button>
        </div>

        <div className="history-calendar__weekdays">
          {WEEKDAY_INDICES.map((i) => (
            <span key={i} className="history-calendar__weekday">
              {getWeekdayLabel(i, locale)}
            </span>
          ))}
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
      </CardContent>
    </Card>
  );
}
