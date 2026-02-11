import type { VerifyGuestResult, GuestVerifyInput, TenantPmsSettings } from '../../types/pms';
export interface IPmsConnector {
    verifyGuest(settings: TenantPmsSettings, input: GuestVerifyInput): Promise<VerifyGuestResult>;
    testConnection(settings: TenantPmsSettings): Promise<{
        ok: boolean;
        message?: string;
    }>;
}
export interface RawSqlRow {
    room_number?: string;
    room?: string;
    name?: string;
    tc?: string;
    passport?: string;
    checkin?: Date | string;
    checkout?: Date | string;
    status?: string;
    external_ref?: string;
    [key: string]: unknown;
}
export declare function mapSqlRowToVerify(row: RawSqlRow, settings: TenantPmsSettings, provider: 'mysql' | 'mssql' | 'postgres', latencyMs: number, cache: 'hit' | 'miss'): VerifyGuestResult;
//# sourceMappingURL=types.d.ts.map