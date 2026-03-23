import { buildMonthGrid } from "@/lib/date/month-grid";

type HistoryCalendarProps = {
  month: string;
  completedDays: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

function formatCalendarLabel(date: string, completed: boolean) {
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));

  return completed ? `${label}, completed` : label;
}

export function HistoryCalendar({ month, completedDays, selectedDate, onSelectDate }: HistoryCalendarProps) {
  const completedDaySet = new Set(completedDays);

  return (
    <section className="card history-calendar">
      <div className="history-calendar__header">
        <h2>Calendar</h2>
        <p>Select a completed day to review your logged exercises and note.</p>
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
