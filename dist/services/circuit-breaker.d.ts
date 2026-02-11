export declare function recordSuccess(tenantId: string): void;
export declare function recordFailure(tenantId: string): void;
export declare function isCircuitOpen(tenantId: string): boolean;
export declare function getCircuitStatus(tenantId: string): {
    open: boolean;
    disabledUntil?: number;
    failures: number;
};
export declare function getRemainingDisabledMs(tenantId: string): number;
//# sourceMappingURL=circuit-breaker.d.ts.map