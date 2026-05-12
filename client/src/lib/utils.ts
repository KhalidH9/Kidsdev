import i18n from '../i18n';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Friendly relative time, locale-aware. */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  const isAr = i18n.language.startsWith('ar');
  if (sec < 45) return isAr ? 'الآن' : 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return isAr ? `منذ ${min} دقيقة` : `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return isAr ? `منذ ${hr} ساعة` : `${hr}h ago`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function formatLongDate(d: Date = new Date()): string {
  const isAr = i18n.language.startsWith('ar');
  if (isAr) {
    return `${DAYS_AR[d.getDay()]}، ${d.getDate()} ${MONTHS_AR[d.getMonth()]}`;
  }
  return `${DAYS_EN[d.getDay()]}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
}

export function timeOfDayGreeting(d: Date = new Date()): string {
  const h = d.getHours();
  const isAr = i18n.language.startsWith('ar');
  if (isAr) {
    if (h < 12) return 'صباح الخير';
    if (h < 17) return 'مساء الخير';
    return 'مساء النور';
  }
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(full: string | null | undefined): string {
  if (!full) return i18n.language.startsWith('ar') ? '' : 'there';
  return full.trim().split(/\s+/)[0] ?? (i18n.language.startsWith('ar') ? '' : 'there');
}

/** "7y 4m" or Arabic equivalent from a DOB ISO date (YYYY-MM-DD). */
export function formatHumanAge(dob: string | null | undefined, now: Date = new Date()): string {
  if (!dob) return '—';
  const d = new Date(dob + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return '—';
  let years = now.getUTCFullYear() - d.getUTCFullYear();
  let months = now.getUTCMonth() - d.getUTCMonth();
  if (now.getUTCDate() < d.getUTCDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const isAr = i18n.language.startsWith('ar');
  if (isAr) {
    if (years <= 0) return `${Math.max(0, months)} شهر`;
    return `${years} سنة ${Math.max(0, months)} شهر`;
  }
  if (years <= 0) return `${Math.max(0, months)}m`;
  return `${years}y ${Math.max(0, months)}m`;
}
