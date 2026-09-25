// Helpers for building safe HTML emails

export const APP_URL = 'https://cemi-tool-tracker.base44.app';

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Returns a copy where every string (in nested objects/arrays) is HTML-escaped
export function escapeDeep(value) {
  if (typeof value === 'string') return escapeHtml(value);
  if (Array.isArray(value)) return value.map(escapeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = escapeDeep(value[key]);
    return out;
  }
  return value;
}