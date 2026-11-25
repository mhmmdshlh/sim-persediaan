const WIB_TIMEZONE = 'Asia/Jakarta';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: WIB_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: WIB_TIMEZONE,
  weekday: 'short',
});

export function todayWib(now: Date = new Date()): string {
  return dateFormatter.format(now);
}

export function addDaysWib(days: number, now: Date = new Date()): string {
  const base = todayWib(now);
  const [year, month, day] = base.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  return utcDate.toISOString().slice(0, 10);
}

// Suppliers close on Sunday, so Friday and Saturday trigger pre-weekend restock alerts.
export function isPreWeekendWib(now: Date = new Date()): boolean {
  const day = weekdayFormatter.format(now);
  return day === 'Fri' || day === 'Sat';
}
