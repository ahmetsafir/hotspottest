/**
 * RADIUS entegrasyonu: Session-Timeout, Expiration (radcheck)
 * Format: "DD Mon YYYY HH:MM:SS" (ör: "13 Feb 2025 14:30:00")
 */

export function formatExpiration(date: Date): string {
  const days = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getDate();
  const mon = days[date.getMonth()];
  const y = date.getFullYear();
  const h = date.getHours();
  const min = date.getMinutes();
  const s = date.getSeconds();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d} ${mon} ${y} ${pad(h)}:${pad(min)}:${pad(s)}`;
}

export function getRadiusAttributes(opts: {
  sessionTimeoutSeconds?: number;
  validUntil?: Date;
}): Array<{ attribute: string; value: string }> {
  const attrs: Array<{ attribute: string; value: string }> = [];
  if (opts.sessionTimeoutSeconds != null && opts.sessionTimeoutSeconds > 0) {
    attrs.push({ attribute: 'Session-Timeout', value: String(opts.sessionTimeoutSeconds) });
  }
  if (opts.validUntil) {
    attrs.push({ attribute: 'Expiration', value: formatExpiration(opts.validUntil) });
  }
  return attrs;
}

/** RADIUS radreply örneği (login OK) */
export function buildRadReply(opts: {
  sessionTimeoutSeconds?: number;
  validUntil?: Date;
}): string[] {
  return getRadiusAttributes(opts).map((a) => `${a.attribute}=${a.value}`);
}

/** RADIUS radcheck Expiration örneği - CoA veya DB güncellemesi için */
export function expirationRadcheckValue(validUntil: Date): string {
  return formatExpiration(validUntil);
}
