type MonthGridDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
};

function parseMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  return {
    year,
    monthIndex: monthNumber - 1,
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function buildMonthGrid(month: string): MonthGridDay[] {
  const { year, monthIndex } = parseMonth(month);
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOfGrid = new Date(year, monthIndex, 1 - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, offset) => {
    const cellDate = new Date(startOfGrid);
    cellDate.setDate(startOfGrid.getDate() + offset);

    return {
      date: toDateKey(cellDate),
      dayOfMonth: cellDate.getDate(),
      inMonth: cellDate.getMonth() === monthIndex,
    };
  });
}
