import type { TenantPmsSettings } from '../../types/pms';
import type { IPmsConnector } from './types';
import type { GuestVerifyInput, VerifyGuestResult } from '../../types/pms';
export declare class MysqlPmsConnector implements IPmsConnector {
    verifyGuest(settings: TenantPmsSettings, input: GuestVerifyInput): Promise<VerifyGuestResult>;
    testConnection(settings: TenantPmsSettings): Promise<{
        ok: boolean;
        message?: string;
    }>;
}
//# sourceMappingURL=mysql.d.ts.map