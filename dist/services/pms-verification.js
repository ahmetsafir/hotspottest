"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyLoginRules = applyLoginRules;
exports.verifyGuest = verifyGuest;
const pms_1 = require("../providers/pms");
const tenant_settings_1 = require("./tenant-settings");
const circuit_breaker_1 = require("./circuit-breaker");
const verification_cache_1 = require("./verification-cache");
const verification_log_1 = require("./verification-log");
const metrics_1 = require("./metrics");
function applyLoginRules(result, settings) {
    let ok = result.ok;
    if (!result.matched) {
        ok = false;
    }
    else if (result.status === 'checked_out') {
        ok = false;
    }
    else if (result.valid_until && result.valid_until.getTime() < Date.now()) {
        ok = false;
    }
    else if (result.status === 'in_house') {
        ok = true;
    }
    else if (result.status === 'unknown') {
        ok = settings.pms_unknown_mode === 'short_session';
        if (ok) {
            result.session_timeout_seconds = Math.min(settings.pms_session_timeout_minutes * 60, 1440 * 60);
        }
    }
    return { ...result, ok };
}
async function verifyGuest(input) {
    const settings = (0, tenant_settings_1.getTenantPmsSettings)(input.tenantId);
    const failMode = settings?.pms_fail_mode ?? 'deny';
    const unknownMode = settings?.pms_unknown_mode ?? 'deny';
    const defaultFail = (provider, latencyMs) => ({
        matched: false,
        status: 'unknown',
        room_number: input.roomNumber,
        provider,
        ok: failMode === 'bypass',
        latency_ms: latencyMs,
        cache: 'miss',
    });
    if (!settings || settings.pms_provider === 'none') {
        const res = defaultFail('none', 0);
        (0, verification_log_1.recordVerificationLog)(input.tenantId, res);
        (0, metrics_1.recordMetrics)(input.tenantId, res, 'deny');
        return res;
    }
    const cached = (0, verification_cache_1.getCached)(input.tenantId, input.roomNumber, input.identityHash);
    if (cached) {
        (0, verification_log_1.recordVerificationLog)(input.tenantId, cached);
        (0, metrics_1.recordMetrics)(input.tenantId, cached, null);
        return cached;
    }
    if ((0, circuit_breaker_1.isCircuitOpen)(input.tenantId)) {
        const res = defaultFail(settings.pms_provider, 0);
        (0, verification_log_1.recordVerificationLog)(input.tenantId, res);
        (0, metrics_1.recordMetrics)(input.tenantId, res, failMode === 'bypass' ? 'bypass' : 'deny');
        return res;
    }
    const connector = (0, pms_1.getPmsConnector)(settings.pms_provider);
    if (!connector) {
        const res = defaultFail(settings.pms_provider, 0);
        (0, verification_log_1.recordVerificationLog)(input.tenantId, res);
        (0, metrics_1.recordMetrics)(input.tenantId, res, 'deny');
        return res;
    }
    const start = Date.now();
    let result;
    try {
        result = await connector.verifyGuest(settings, input);
        (0, circuit_breaker_1.recordSuccess)(input.tenantId);
    }
    catch (e) {
        (0, circuit_breaker_1.recordFailure)(input.tenantId);
        const latencyMs = Date.now() - start;
        result = defaultFail(settings.pms_provider, latencyMs);
        (0, verification_log_1.recordVerificationLog)(input.tenantId, result);
        (0, metrics_1.recordMetrics)(input.tenantId, result, failMode === 'bypass' ? 'bypass' : 'deny');
        return result;
    }
    result = applyLoginRules(result, settings);
    if (result.ok && result.matched) {
        (0, verification_cache_1.setCached)(input.tenantId, input.roomNumber, input.identityHash, result);
    }
    (0, verification_log_1.recordVerificationLog)(input.tenantId, result);
    (0, metrics_1.recordMetrics)(input.tenantId, result, null);
    return result;
}
//# sourceMappingURL=pms-verification.js.map