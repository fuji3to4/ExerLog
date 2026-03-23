import type { HistoryDaySummary } from "../history-query";

type DaySummaryProps = {
  selectedDate: string | null;
  summary: HistoryDaySummary | null;
};

function formatResult(result: HistoryDaySummary["logs"][number]["result"]) {
  if (result === "did") {
    return "Did it";
  }

  if (result === "partial") {
    return "Partly";
  }

  return "Couldn't";
}

export function DaySummary({ selectedDate, summary }: DaySummaryProps) {
  if (!selectedDate || !summary) {
    return (
      <section className="card day-summary">
        <h2>Day summary</h2>
        <p>Select a day from the calendar to review what you logged.</p>
      </section>
    );
  }

  return (
    <section className="card day-summary">
      <h2>Day summary</h2>

      <div className="day-summary__section">
        <h3>Exercises</h3>
        {summary.logs.length === 0 ? (
          <p>No logged exercises for this day.</p>
        ) : (
          <ul className="day-summary__list">
            {summary.logs.map((log) => (
              <li key={log.exerciseId} className="day-summary__item">
                <span>{log.title}</span>
                <span className="day-summary__result">{formatResult(log.result)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {summary.conditionLevel ? (
        <div className="day-summary__section">
          <h3>Condition</h3>
          <p>{summary.conditionLevel}</p>
          {summary.note ? <p>{summary.note}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
