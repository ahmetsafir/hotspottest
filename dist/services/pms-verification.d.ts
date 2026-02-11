import type { GuestVerifyInput, VerifyGuestResult, TenantPmsSettings } from '../types/pms';
export declare function applyLoginRules(result: VerifyGuestResult, settings: TenantPmsSettings): VerifyGuestResult;
export declare function verifyGuest(input: GuestVerifyInput): Promise<VerifyGuestResult>;
//# sourceMappingURL=pms-verification.d.ts.map