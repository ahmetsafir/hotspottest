"use strict";
/**
 * PMS Gateway - Ortak tipler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL_SECONDS = exports.CIRCUIT_DISABLE_DURATION_MS = exports.CIRCUIT_FAILURE_THRESHOLD = exports.PMS_QUERY_TIMEOUT_MS = exports.MAX_SESSION_TIMEOUT_MINUTES = exports.TENANT_PMS_KEYS = void 0;
exports.TENANT_PMS_KEYS = [
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
];
exports.MAX_SESSION_TIMEOUT_MINUTES = 1440;
exports.PMS_QUERY_TIMEOUT_MS = 5000;
exports.CIRCUIT_FAILURE_THRESHOLD = 5;
exports.CIRCUIT_DISABLE_DURATION_MS = 2 * 60 * 1000;
exports.CACHE_TTL_SECONDS = 5 * 60;
//# sourceMappingURL=pms.js.map