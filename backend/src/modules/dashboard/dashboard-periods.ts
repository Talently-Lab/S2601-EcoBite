export const DASHBOARD_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export type DashboardDateRange = { gte: Date; lt: Date };

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: DASHBOARD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function localParts(date: Date) {
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}

function midnight(localDay: number): Date {
  // Convert the calendar boundary using the zone's offset, independently of the process timezone.
  return new Date(localDay - (localParts(new Date(localDay)) - localDay));
}

export function getDashboardPeriods(now: Date) {
  const local = new Date(localParts(now));
  const day = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  const calendarDayMs = 24 * 60 * 60 * 1000;
  const end = midnight(day + calendarDayMs);
  const split = midnight(day - 29 * calendarDayMs);
  const start = midnight(day - 59 * calendarDayMs);
  return {
    current: { gte: split, lt: end },
    previous: { gte: start, lt: split },
  };
}
