import type { VerifyGuestResult, VerificationLogEntry } from '../types/pms';
export declare function recordVerificationLog(tenantId: string, result: VerifyGuestResult): void;
export declare function getLastVerifications(tenantId: string, limit?: number): VerificationLogEntry[];
export declare function getVerificationLogs(tenantId?: string): VerificationLogEntry[];
//# sourceMappingURL=verification-log.d.ts.map