"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMetrics = recordMetrics;
exports.recordCircuitOpen = recordCircuitOpen;
exports.getMetrics = getMetrics;
exports.getMetricsAll = getMetricsAll;
const byTenant = new Map();
function getOrCreate(tenantId) {
    let m = byTenant.get(tenantId);
    if (!m) {
        m = {
            total_verifications: 0,
            successful_verifications: 0,
            failed_verifications: 0,
            cache_hits: 0,
            bypass_count: 0,
            deny_count: 0,
            avg_latency: 0,
            circuit_open_count: 0,
            latency_sum: 0,
            count: 0,
        };
        byTenant.set(tenantId, m);
    }
    return m;
}
function recordMetrics(tenantId, result, bypassOrDeny) {
    const m = getOrCreate(tenantId);
    m.total_verifications += 1;
    if (result.ok)
        m.successful_verifications += 1;
    else
        m.failed_verifications += 1;
    if (result.cache === 'hit')
        m.cache_hits += 1;
    if (bypassOrDeny === 'bypass')
        m.bypass_count += 1;
    if (bypassOrDeny === 'deny')
        m.deny_count += 1;
    m.latency_sum += result.latency_ms;
    m.count += 1;
    m.avg_latency = m.count ? m.latency_sum / m.count : 0;
}
function recordCircuitOpen(tenantId) {
    const m = getOrCreate(tenantId);
    m.circuit_open_count += 1;
}
function getMetrics(tenantId) {
    const m = byTenant.get(tenantId);
    if (!m)
        return null;
    return {
        total_verifications: m.total_verifications,
        successful_verifications: m.successful_verifications,
        failed_verifications: m.failed_verifications,
        cache_hits: m.cache_hits,
        bypass_count: m.bypass_count,
        deny_count: m.deny_count,
        avg_latency: Math.round(m.avg_latency * 100) / 100,
        circuit_open_count: m.circuit_open_count,
    };
}
function getMetricsAll() {
    const out = {};
    for (const [tid, m] of byTenant.entries()) {
        out[tid] = {
            total_verifications: m.total_verifications,
            successful_verifications: m.successful_verifications,
            failed_verifications: m.failed_verifications,
            cache_hits: m.cache_hits,
            bypass_count: m.bypass_count,
            deny_count: m.deny_count,
            avg_latency: Math.round(m.avg_latency * 100) / 100,
            circuit_open_count: m.circuit_open_count,
        };
    }
    return out;
}
//# sourceMappingURL=metrics.js.map