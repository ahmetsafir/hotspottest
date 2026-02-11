import type { TenantPmsSettings, PmsProvider, PmsFailMode, PmsUnknownMode } from '../types/pms';
import { TENANT_PMS_KEYS } from '../types/pms';
import { MAX_SESSION_TIMEOUT_MINUTES } from '../types/pms';

export type TenantSettingsStore = Record<string, Record<string, string | number | undefined>>;

const defaultStore: TenantSettingsStore = {};

let store: TenantSettingsStore = { ...defaultStore };

export function setTenantSettings(tenantId: string, key: string, value: string | number | undefined): void {
  if (!store[tenantId]) store[tenantId] = {};
  store[tenantId][key] = value;
}

export function getTenantSetting<T = string | number | undefined>(tenantId: string, key: string): T | undefined {
  return store[tenantId]?.[key] as T | undefined;
}

export function getTenantPmsSettings(tenantId: string): TenantPmsSettings | null {
  const raw = store[tenantId];
  if (!raw || !raw.pms_provider) return null;

  const provider = (raw.pms_provider as string) as PmsProvider;
  if (provider === 'none') return null;

  const sessionMinutes = Math.min(
    Number(raw.pms_session_timeout_minutes) || 60,
    MAX_SESSION_TIMEOUT_MINUTES
  );

  return {
    pms_provider: provider,
    pms_fail_mode: (raw.pms_fail_mode as PmsFailMode) || 'deny',
    pms_unknown_mode: (raw.pms_unknown_mode as PmsUnknownMode) || 'deny',
    pms_session_timeout_minutes: sessionMinutes,
    pms_db_host: raw.pms_db_host as string | undefined,
    pms_db_port: raw.pms_db_port != null ? Number(raw.pms_db_port) : undefined,
    pms_db_user: raw.pms_db_user as string | undefined,
    pms_db_password: raw.pms_db_password as string | undefined,
    pms_db_database: raw.pms_db_database as string | undefined,
    pms_sql_table: raw.pms_sql_table as string | undefined,
    pms_sql_room_column: raw.pms_sql_room_column as string | undefined,
    pms_sql_name_column: raw.pms_sql_name_column as string | undefined,
    pms_sql_tc_column: raw.pms_sql_tc_column as string | undefined,
    pms_sql_passport_column: raw.pms_sql_passport_column as string | undefined,
    pms_sql_checkin_column: raw.pms_sql_checkin_column as string | undefined,
    pms_sql_checkout_column: raw.pms_sql_checkout_column as string | undefined,
    pms_sql_status_column: raw.pms_sql_status_column as string | undefined,
    pms_sql_inhouse_value: raw.pms_sql_inhouse_value as string | undefined,
    pms_sql_external_ref_column: raw.pms_sql_external_ref_column as string | undefined,
    pms_api_url: raw.pms_api_url as string | undefined,
    pms_api_key: raw.pms_api_key as string | undefined,
  };
}

export function setTenantPmsSettingsFromKv(tenantId: string, kv: Record<string, string | number | undefined>): void {
  for (const key of TENANT_PMS_KEYS) {
    if (kv[key] !== undefined) setTenantSettings(tenantId, key, kv[key]);
  }
}

export function injectTenantStore(s: TenantSettingsStore): void {
  store = s;
}

export function getStore(): TenantSettingsStore {
  return store;
}
