/** Next sequential id such as REQ004, based on the highest existing number (safe after deletions). */
export function nextSequentialId(prefix: string, existing: Array<{ id?: string }>, pad = 3): string {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  const max = existing.reduce((m, r) => {
    const hit = re.exec(String(r.id || ''));
    const n = hit ? parseInt(hit[1], 10) : 0;
    return n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

/** Business time zone of the app (all dates the users see and type are in this zone). Override with APP_TIMEZONE. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/**
 * Today as YYYY-MM-DD in the business time zone.
 * (toISOString() would give the UTC date, which in India is still "yesterday" until 05:30 in the morning.)
 */
export function today(at: Date = new Date()): string {
  try {
    // en-CA formats dates as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
