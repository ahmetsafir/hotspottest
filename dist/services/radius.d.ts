/**
 * RADIUS entegrasyonu: Session-Timeout, Expiration (radcheck)
 * Format: "DD Mon YYYY HH:MM:SS" (ör: "13 Feb 2025 14:30:00")
 */
export declare function formatExpiration(date: Date): string;
export declare function getRadiusAttributes(opts: {
    sessionTimeoutSeconds?: number;
    validUntil?: Date;
}): Array<{
    attribute: string;
    value: string;
}>;
/** RADIUS radreply örneği (login OK) */
export declare function buildRadReply(opts: {
    sessionTimeoutSeconds?: number;
    validUntil?: Date;
}): string[];
/** RADIUS radcheck Expiration örneği - CoA veya DB güncellemesi için */
export declare function expirationRadcheckValue(validUntil: Date): string;
//# sourceMappingURL=radius.d.ts.map