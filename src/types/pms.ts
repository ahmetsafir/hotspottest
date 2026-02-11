/**
 * PMS Gateway - Ortak tipler
 */

export type PmsProvider = 'api' | 'mysql' | 'mssql' | 'postgres' | 'none';
export type StayStatus = 'in_house' | 'checked_out' | 'unknown';
export type PmsFailMode = 'deny' | 'bypass';
export type PmsUnknownMode = 'deny' | 'short_session';
export type CacheResult = 'hit' | 'miss';

export interface VerifyGuestResult {
  matched: boolean;
  status: StayStatus;
  valid_until?: Date;
  external_ref?: string;
  room_number: string;
  provider: PmsProvider;
  ok: boolean;
  session_timeout_seconds?: number;
  latency_ms: number;
  cache: CacheResult;
}

export interface TenantPmsSettings {
  pms_provider: PmsProvider;
  pms_fail_mode: PmsFailMode;
  pms_unknown_mode: PmsUnknownMode;
  pms_session_timeout_minutes: number;
  pms_db_host?: string;
  pms_db_port?: number;
  pms_db_user?: string;
  pms_db_password?: string;
  pms_db_database?: string;
  pms_sql_table?: string;
  pms_sql_room_column?: string;
  pms_sql_name_column?: string;
  pms_sql_tc_column?: string;
  pms_sql_passport_column?: string;
  pms_sql_checkin_column?: string;
  pms_sql_checkout_column?: string;
  pms_sql_status_column?: string;
  pms_sql_inhouse_value?: string;
  pms_sql_external_ref_column?: string;
  pms_api_url?: string;
  pms_api_key?: string;
}

export interface GuestVerifyInput {
  tenantId: string;
  roomNumber: string;
  identityHash: string;
  name?: string;
  tc?: string;
  passport?: string;
}

export interface VerificationLogEntry {
  tenant_id: string;
  room_number: string;
  status: StayStatus;
  provider: PmsProvider;
  cache: CacheResult;
  latency_ms: number;
  matched: boolean;
  ok: boolean;
  created_at: Date;
}

export interface PmsMetrics {
  total_verifications: number;
  successful_verifications: number;
  failed_verifications: number;
  cache_hits: number;
  bypass_count: number;
  deny_count: number;
  avg_latency: number;
  circuit_open_count: number;
}

export const TENANT_PMS_KEYS = [
  'pms_provider',
  'pms_fail_mode',
  'pms_unknown_mode',
  'pms_session_timeout_minutes',
  'pms_db_host',
  'pms_db_port',
  'pms_db_user',
  'pms_db_password',
  'pms_db_database',
  'pms_sql_table',
  'pms_sql_room_column',
  'pms_sql_name_column',
  'pms_sql_tc_column',
  'pms_sql_passport_column',
  'pms_sql_checkin_column',
  'pms_sql_checkout_column',
  'pms_sql_status_column',
  'pms_sql_inhouse_value',
  'pms_sql_external_ref_column',
  'pms_api_url',
  'pms_api_key',
] as const;

export const MAX_SESSION_TIMEOUT_MINUTES = 1440;
export const PMS_QUERY_TIMEOUT_MS = 5000;
export const CIRCUIT_FAILURE_THRESHOLD = 5;
export const CIRCUIT_DISABLE_DURATION_MS = 2 * 60 * 1000;
export const CACHE_TTL_SECONDS = 5 * 60;
