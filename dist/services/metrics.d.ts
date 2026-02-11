import type { VerifyGuestResult, PmsMetrics } from '../types/pms';
export declare function recordMetrics(tenantId: string, result: VerifyGuestResult, bypassOrDeny: 'bypass' | 'deny' | null): void;
export declare function recordCircuitOpen(tenantId: string): void;
export declare function getMetrics(tenantId: string): PmsMetrics | null;
export declare function getMetricsAll(): Record<string, PmsMetrics>;
//# sourceMappingURL=metrics.d.ts.map