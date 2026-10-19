/** Date helpers shared across StaffSync. All dates are stored as ISO yyyy-mm-dd. */

const MS_DAY = 86400000;

export function isoDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return isoDate(new Date());
}

export function parseISO(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return Number.isNaN(iso.getTime()) ? null : new Date(iso.getTime());
  const value = String(iso);
  // Full timestamps (e.g. "2026-10-19T05:32:12.000Z") come from audit fields.
  if (value.includes('T')) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDays(iso, days) {
  const d = parseISO(iso) || new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isWeekend(date) {
  const day = (date instanceof Date ? date : parseISO(date)).getDay();
  return day === 0 || day === 6;
}

export function daysBetween(fromISO, toISO) {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  if (!a || !b) return 0;
  return Math.round((b - a) / MS_DAY) + 1;
}

/** Inclusive list of ISO dates between two ISO dates. */
export function dateRange(fromISO, toISO) {
  const out = [];
  let cursor = fromISO;
  let guard = 0;
  while (cursor <= toISO && guard < 400) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function formatDate(iso, opts = {}) {
  const date = typeof iso === 'string' ? parseISO(iso) : iso;
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

export function formatDateLong(iso) {
  const date = typeof iso === 'string' ? parseISO(iso) : iso;
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatRange(fromISO, toISO) {
  if (!fromISO) return '—';
  if (!toISO || fromISO === toISO) return formatDate(fromISO);
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return `${a.getDate()} – ${b.getDate()} ${b.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;
  }
  return `${formatDate(fromISO)} – ${formatDate(toISO)}`;
}

export function relativeTime(isoOrDate) {
  const date = typeof isoOrDate === 'string' && isoOrDate.length <= 10
    ? parseISO(isoOrDate)
    : new Date(isoOrDate);
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return formatDate(date);
}

export function weekdayShort(iso) {
  return parseISO(iso).toLocaleDateString('en-IN', { weekday: 'short' });
}

export function weekdayNarrow(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'narrow' });
}

export function monthLabel(date = new Date()) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** 6x7 calendar matrix (Monday first) with iso dates + inMonth flags. */
export function getMonthMatrix(date = new Date()) {
  const first = startOfMonth(date);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + w * 7 + d);
      week.push({
        date: day,
        iso: isoDate(day),
        inMonth: day.getMonth() === date.getMonth(),
        isToday: isoDate(day) === todayISO(),
      });
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatTime12h(time) {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function nowTime24() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function durationLabel(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
