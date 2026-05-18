const TAIPEI_TIME_ZONE = "Asia/Taipei";
const DAY_MS = 24 * 60 * 60 * 1000;

const taipeiFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TAIPEI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function taipeiDateParts(date) {
  const parts = Object.fromEntries(
    taipeiFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function getPreviousTaipeiWeek(referenceDate = new Date()) {
  const { year, month, day } = taipeiDateParts(referenceDate);
  const taipeiToday = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (taipeiToday.getUTCDay() + 6) % 7;
  const currentWeekMonday = new Date(taipeiToday.getTime() - mondayOffset * DAY_MS);
  const start = new Date(currentWeekMonday.getTime() - 7 * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);

  return {
    start,
    end,
    startDate: formatDate(start),
    endDate: formatDate(end),
    key: `${formatDate(start)}_${formatDate(end)}`,
    slug: `weekly-world-news-${formatDate(start)}`,
    generatedDate: formatDate(taipeiToday),
    timeZone: TAIPEI_TIME_ZONE,
  };
}

export function formatTaipeiWeekLabel(week) {
  return `${week.startDate} 至 ${week.endDate}`;
}
