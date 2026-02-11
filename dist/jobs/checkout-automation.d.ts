import { type MikrotikConfig } from '../services/mikrotik';
export interface CheckoutJobStatus {
    lastRunAt: Date | null;
    lastRunCount: number;
    lastError: string | null;
    nextRunAt: Date | null;
}
export declare function setMikrotikConfig(tenantId: string, config: MikrotikConfig): void;
export declare function setRadiusUpdateCallback(fn: (tenantId: string, username: string, expiration: string) => Promise<void>): void;
export declare function getCheckoutJobStatus(): CheckoutJobStatus;
export declare function startCheckoutJob(): void;
export declare function stopCheckoutJob(): void;
//# sourceMappingURL=checkout-automation.d.ts.map