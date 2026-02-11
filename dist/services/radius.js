"use strict";
/**
 * RADIUS entegrasyonu: Session-Timeout, Expiration (radcheck)
 * Format: "DD Mon YYYY HH:MM:SS" (ör: "13 Feb 2025 14:30:00")
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatExpiration = formatExpiration;
exports.getRadiusAttributes = getRadiusAttributes;
exports.buildRadReply = buildRadReply;
exports.expirationRadcheckValue = expirationRadcheckValue;
function formatExpiration(date) {
    const days = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = date.getDate();
    const mon = days[date.getMonth()];
    const y = date.getFullYear();
    const h = date.getHours();
    const min = date.getMinutes();
    const s = date.getSeconds();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d} ${mon} ${y} ${pad(h)}:${pad(min)}:${pad(s)}`;
}
function getRadiusAttributes(opts) {
    const attrs = [];
    if (opts.sessionTimeoutSeconds != null && opts.sessionTimeoutSeconds > 0) {
        attrs.push({ attribute: 'Session-Timeout', value: String(opts.sessionTimeoutSeconds) });
    }
    if (opts.validUntil) {
        attrs.push({ attribute: 'Expiration', value: formatExpiration(opts.validUntil) });
    }
    return attrs;
}
/** RADIUS radreply örneği (login OK) */
function buildRadReply(opts) {
    return getRadiusAttributes(opts).map((a) => `${a.attribute}=${a.value}`);
}
/** RADIUS radcheck Expiration örneği - CoA veya DB güncellemesi için */
function expirationRadcheckValue(validUntil) {
    return formatExpiration(validUntil);
}
//# sourceMappingURL=radius.js.map