"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pms_verification_1 = require("../services/pms-verification");
const tenant_settings_1 = require("../services/tenant-settings");
const pms_1 = require("../providers/pms");
const circuit_breaker_1 = require("../services/circuit-breaker");
const metrics_1 = require("../services/metrics");
const verification_log_1 = require("../services/verification-log");
const verification_cache_1 = require("../services/verification-cache");
const checkout_automation_1 = require("../jobs/checkout-automation");
const radius_1 = require("../services/radius");
const router = (0, express_1.Router)();
const testVerifyLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: { ok: false, error: 'Rate limit: 10/dk' },
});
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 30,
    message: { ok: false, error: 'Rate limit: 30/dk' },
});
router.get('/health', (req, res) => {
    const tenantId = req.query.tenant_id || '';
    const settings = tenantId ? (0, tenant_settings_1.getTenantPmsSettings)(tenantId) : null;
    res.json({
        ok: true,
        pms: settings
            ? {
                provider: settings.pms_provider,
                configured: settings.pms_provider !== 'none',
            }
            : null,
    });
});
router.get('/metrics', (req, res) => {
    const tenantId = req.query.tenant_id;
    const metrics = tenantId ? (0, metrics_1.getMetrics)(tenantId) : (0, metrics_1.getMetricsAll)();
    res.json(metrics);
});
router.get('/circuit-status', (req, res) => {
    const tenantId = req.query.tenant_id || '';
    if (!tenantId)
        return res.status(400).json({ error: 'tenant_id required' });
    const status = (0, circuit_breaker_1.getCircuitStatus)(tenantId);
    const remainingMs = (0, circuit_breaker_1.getRemainingDisabledMs)(tenantId);
    res.json({ ...status, remainingDisabledMs: remainingMs });
});
router.post('/test-verify', testVerifyLimiter, async (req, res) => {
    const tenantId = (req.body?.tenant_id ?? req.query.tenant_id);
    const roomNumber = (req.body?.room_number ?? req.query.room_number);
    const identityHash = (req.body?.identity_hash ?? req.query.identity_hash);
    if (!tenantId || !roomNumber || !identityHash) {
        return res.status(400).json({ ok: false, error: 'tenant_id, room_number, identity_hash required' });
    }
    const result = await (0, pms_verification_1.verifyGuest)({
        tenantId,
        roomNumber,
        identityHash,
        name: req.body?.name,
        tc: req.body?.tc,
        passport: req.body?.passport,
    });
    res.json(result);
});
router.post('/login', loginLimiter, async (req, res) => {
    const tenantId = (req.body?.tenant_id ?? req.query.tenant_id);
    const roomNumber = (req.body?.room_number ?? req.query.room_number);
    const identityHash = (req.body?.identity_hash ?? req.query.identity_hash);
    if (!tenantId || !roomNumber || !identityHash) {
        return res.status(400).json({ ok: false, error: 'tenant_id, room_number, identity_hash required' });
    }
    const result = await (0, pms_verification_1.verifyGuest)({
        tenantId,
        roomNumber,
        identityHash,
        name: req.body?.name,
        tc: req.body?.tc,
        passport: req.body?.passport,
    });
    const radiusAttrs = (0, radius_1.getRadiusAttributes)({
        sessionTimeoutSeconds: result.session_timeout_seconds,
        validUntil: result.valid_until,
    });
    res.json({ ...result, radius_attributes: radiusAttrs });
});
router.get('/dashboard', (req, res) => {
    const tenantId = req.query.tenant_id || '';
    if (!tenantId)
        return res.status(400).json({ error: 'tenant_id required' });
    const settings = (0, tenant_settings_1.getTenantPmsSettings)(tenantId);
    const circuit = (0, circuit_breaker_1.getCircuitStatus)(tenantId);
    const metrics = (0, metrics_1.getMetrics)(tenantId);
    const cacheStats = (0, verification_cache_1.getCacheStats)(tenantId);
    const verifications = (0, verification_log_1.getLastVerifications)(tenantId, 50);
    const jobStatus = (0, checkout_automation_1.getCheckoutJobStatus)();
    const hitRate = metrics && metrics.total_verifications > 0
        ? Math.round((metrics.cache_hits / metrics.total_verifications) * 100)
        : 0;
    res.json({
        cards: {
            provider: settings?.pms_provider ?? 'none',
            online: !circuit.open,
            circuitOpen: circuit.open,
            failMode: settings?.pms_fail_mode ?? 'deny',
            unknownMode: settings?.pms_unknown_mode ?? 'deny',
            avgLatency: metrics?.avg_latency ?? 0,
            cacheHitRate: hitRate,
            verificationsLast24h: metrics?.total_verifications ?? 0,
        },
        charts: {
            verificationsLast24h: metrics?.total_verifications ?? 0,
            successRate: metrics && metrics.total_verifications > 0
                ? Math.round((metrics.successful_verifications / metrics.total_verifications) * 100)
                : 0,
            cacheHitRate: hitRate,
            checkoutDrops: jobStatus.lastRunCount,
        },
        verifications: verifications,
        circuitCountdownMs: (0, circuit_breaker_1.getRemainingDisabledMs)(tenantId),
        jobStatus,
    });
});
router.get('/job-status', (req, res) => {
    res.json((0, checkout_automation_1.getCheckoutJobStatus)());
});
router.post('/settings', (req, res) => {
    const tenantId = (req.body?.tenant_id ?? req.query.tenant_id);
    if (!tenantId)
        return res.status(400).json({ error: 'tenant_id required' });
    const kv = req.body?.settings ?? req.body;
    (0, tenant_settings_1.setTenantPmsSettingsFromKv)(tenantId, kv);
    res.json({ ok: true });
});
router.post('/test-connection', async (req, res) => {
    const tenantId = (req.body?.tenant_id ?? req.query.tenant_id);
    if (!tenantId)
        return res.status(400).json({ error: 'tenant_id required' });
    const settings = (0, tenant_settings_1.getTenantPmsSettings)(tenantId);
    if (!settings || settings.pms_provider === 'none') {
        return res.json({ ok: false, message: 'PMS provider not configured' });
    }
    const connector = (0, pms_1.getPmsConnector)(settings.pms_provider);
    if (!connector)
        return res.json({ ok: false, message: 'Provider not found' });
    const result = await connector.testConnection(settings);
    res.json(result);
});
exports.default = router;
//# sourceMappingURL=pms.js.map