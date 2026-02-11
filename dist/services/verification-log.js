"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordVerificationLog = recordVerificationLog;
exports.getLastVerifications = getLastVerifications;
exports.getVerificationLogs = getVerificationLogs;
const logs = [];
const MAX_LOGS = 500;
function recordVerificationLog(tenantId, result) {
    const entry = {
        tenant_id: tenantId,
        room_number: result.room_number,
        status: result.status,
        provider: result.provider,
        cache: result.cache,
        latency_ms: result.latency_ms,
        matched: result.matched,
        ok: result.ok,
        created_at: new Date(),
    };
    logs.unshift(entry);
    if (logs.length > MAX_LOGS)
        logs.length = MAX_LOGS;
}
function getLastVerifications(tenantId, limit = 50) {
    return logs.filter((e) => e.tenant_id === tenantId).slice(0, limit);
}
function getVerificationLogs(tenantId) {
    if (!tenantId)
        return [...logs].slice(0, 100);
    return logs.filter((e) => e.tenant_id === tenantId);
}
//# sourceMappingURL=verification-log.js.map