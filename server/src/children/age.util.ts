/**
 * Format age from a date of birth (YYYY-MM-DD) as 'YY-MM-DD' = years-months-days.
 */
export function formatAge(dateOfBirth: string, now: Date = new Date()): string {
  const dob = new Date(dateOfBirth + 'T00:00:00Z');
  if (Number.isNaN(dob.getTime())) return '00-00-00';

  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  let months = now.getUTCMonth() - dob.getUTCMonth();
  let days = now.getUTCDate() - dob.getUTCDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    days += prevMonth.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
  return `${pad(years)}-${pad(months)}-${pad(days)}`;
}
