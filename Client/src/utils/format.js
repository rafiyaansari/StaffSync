/** Small formatting helpers. */

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || '';
}

export function fullName(employee) {
  if (!employee) return '';
  return employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
}

export function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm || `${singular}s`}`;
}

export function currencyINR(value, compact = false) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value);
}

export function numberIN(value) {
  return new Intl.NumberFormat('en-IN').format(value ?? 0);
}

export function percent(value, decimals = 0) {
  return `${Number(value).toFixed(decimals)}%`;
}

export function titleCase(value = '') {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function avatarTone(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return hash % 8;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const av = typeof key === 'function' ? key(a) : a[key];
    const bv = typeof key === 'function' ? key(b) : b[key];
    if (av == null || bv == null) return 0;
    if (typeof av === 'number' && typeof bv === 'number') {
      return direction === 'asc' ? av - bv : bv - av;
    }
    return direction === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });
}

/** Download a CSV file from rows of objects. */
export function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
