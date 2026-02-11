"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTenantSettings = setTenantSettings;
exports.getTenantSetting = getTenantSetting;
exports.getTenantPmsSettings = getTenantPmsSettings;
exports.setTenantPmsSettingsFromKv = setTenantPmsSettingsFromKv;
exports.injectTenantStore = injectTenantStore;
exports.getStore = getStore;
const pms_1 = require("../types/pms");
const pms_2 = require("../types/pms");
const defaultStore = {};
let store = { ...defaultStore };
function setTenantSettings(tenantId, key, value) {
    if (!store[tenantId])
        store[tenantId] = {};
    store[tenantId][key] = value;
}
function getTenantSetting(tenantId, key) {
    return store[tenantId]?.[key];
}
function getTenantPmsSettings(tenantId) {
    const raw = store[tenantId];
    if (!raw || !raw.pms_provider)
        return null;
    const provider = raw.pms_provider;
    if (provider === 'none')
        return null;
    const sessionMinutes = Math.min(Number(raw.pms_session_timeout_minutes) || 60, pms_2.MAX_SESSION_TIMEOUT_MINUTES);
    return {
        pms_provider: provider,
        pms_fail_mode: raw.pms_fail_mode || 'deny',
        pms_unknown_mode: raw.pms_unknown_mode || 'deny',
        pms_session_timeout_minutes: sessionMinutes,
        pms_db_host: raw.pms_db_host,
        pms_db_port: raw.pms_db_port != null ? Number(raw.pms_db_port) : undefined,
        pms_db_user: raw.pms_db_user,
        pms_db_password: raw.pms_db_password,
        pms_db_database: raw.pms_db_database,
        pms_sql_table: raw.pms_sql_table,
        pms_sql_room_column: raw.pms_sql_room_column,
        pms_sql_name_column: raw.pms_sql_name_column,
        pms_sql_tc_column: raw.pms_sql_tc_column,
        pms_sql_passport_column: raw.pms_sql_passport_column,
        pms_sql_checkin_column: raw.pms_sql_checkin_column,
        pms_sql_checkout_column: raw.pms_sql_checkout_column,
        pms_sql_status_column: raw.pms_sql_status_column,
        pms_sql_inhouse_value: raw.pms_sql_inhouse_value,
        pms_sql_external_ref_column: raw.pms_sql_external_ref_column,
        pms_api_url: raw.pms_api_url,
        pms_api_key: raw.pms_api_key,
    };
}
function setTenantPmsSettingsFromKv(tenantId, kv) {
    for (const key of pms_1.TENANT_PMS_KEYS) {
        if (kv[key] !== undefined)
            setTenantSettings(tenantId, key, kv[key]);
    }
}
function injectTenantStore(s) {
    store = s;
}
function getStore() {
    return store;
}
//# sourceMappingURL=tenant-settings.js.map