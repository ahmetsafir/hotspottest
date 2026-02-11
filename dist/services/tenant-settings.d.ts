import type { TenantPmsSettings } from '../types/pms';
export type TenantSettingsStore = Record<string, Record<string, string | number | undefined>>;
export declare function setTenantSettings(tenantId: string, key: string, value: string | number | undefined): void;
export declare function getTenantSetting<T = string | number | undefined>(tenantId: string, key: string): T | undefined;
export declare function getTenantPmsSettings(tenantId: string): TenantPmsSettings | null;
export declare function setTenantPmsSettingsFromKv(tenantId: string, kv: Record<string, string | number | undefined>): void;
export declare function injectTenantStore(s: TenantSettingsStore): void;
export declare function getStore(): TenantSettingsStore;
//# sourceMappingURL=tenant-settings.d.ts.map