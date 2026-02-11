"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordSuccess = recordSuccess;
exports.recordFailure = recordFailure;
exports.isCircuitOpen = isCircuitOpen;
exports.getCircuitStatus = getCircuitStatus;
exports.getRemainingDisabledMs = getRemainingDisabledMs;
const pms_1 = require("../types/pms");
const state = {};
function recordSuccess(tenantId) {
    if (state[tenantId]) {
        state[tenantId].failures = 0;
    }
}
function recordFailure(tenantId) {
    if (!state[tenantId])
        state[tenantId] = { failures: 0, disabledUntil: 0 };
    const s = state[tenantId];
    s.failures += 1;
    if (s.failures >= pms_1.CIRCUIT_FAILURE_THRESHOLD) {
        s.disabledUntil = Date.now() + pms_1.CIRCUIT_DISABLE_DURATION_MS;
    }
}
function isCircuitOpen(tenantId) {
    const s = state[tenantId];
    if (!s)
        return false;
    if (s.disabledUntil <= Date.now()) {
        s.disabledUntil = 0;
        s.failures = 0;
        return false;
    }
    return true;
}
function getCircuitStatus(tenantId) {
    const s = state[tenantId];
    if (!s)
        return { open: false, failures: 0 };
    const open = s.disabledUntil > Date.now();
    return {
        open,
        disabledUntil: open ? s.disabledUntil : undefined,
        failures: s.failures,
    };
}
function getRemainingDisabledMs(tenantId) {
    const s = state[tenantId];
    if (!s || s.disabledUntil <= Date.now())
        return 0;
    return Math.max(0, s.disabledUntil - Date.now());
}
//# sourceMappingURL=circuit-breaker.js.map