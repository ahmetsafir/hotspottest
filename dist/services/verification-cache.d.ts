import type { VerifyGuestResult } from '../types/pms';
export declare function getCached(tenantId: string, roomNumber: string, identityHash: string): VerifyGuestResult | null;
export declare function setCached(tenantId: string, roomNumber: string, identityHash: string, result: VerifyGuestResult): void;
export declare function getCacheStats(tenantId?: string): {
    hits: number;
    misses: number;
    keys: number;
};
//# sourceMappingURL=verification-cache.d.ts.map