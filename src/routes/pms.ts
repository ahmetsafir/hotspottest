import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyGuest } from '../services/pms-verification';
import { getTenantPmsSettings, setTenantPmsSettingsFromKv } from '../services/tenant-settings';
import { getPmsConnector } from '../providers/pms';
import { getCircuitStatus, getRemainingDisabledMs } from '../services/circuit-breaker';
import { getMetrics, getMetricsAll } from '../services/metrics';
import { getLastVerifications } from '../services/verification-log';
import { getCacheStats } from '../services/verification-cache';
import { getCheckoutJobStatus } from '../jobs/checkout-automation';
import { getRadiusAttributes } from '../services/radius';

const router = Router();

/** Atlas tenant_id sayı (18) veya string ("18") gönderebilir; hep string kullanıyoruz. */
function normalizeTenantId(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

const testVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Rate limit: 10/dk' },
});
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { ok: false, error: 'Rate limit: 30/dk' },
});

router.get('/health', (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.query.tenant_id);
  const settings = tenantId ? getTenantPmsSettings(tenantId) : null;
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

router.get('/metrics', (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.query.tenant_id);
  const metrics = tenantId ? getMetrics(tenantId) : getMetricsAll();
  res.json(metrics);
});

router.get('/circuit-status', (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.query.tenant_id);
  if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
  const status = getCircuitStatus(tenantId);
  const remainingMs = getRemainingDisabledMs(tenantId);
  res.json({ ...status, remainingDisabledMs: remainingMs });
});

router.post('/test-verify', testVerifyLimiter, async (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.body?.tenant_id ?? req.query.tenant_id);
  const roomNumber = String(req.body?.room_number ?? req.query.room_number ?? '').trim();
  const identityHash = String(req.body?.identity_hash ?? req.query.identity_hash ?? '').trim();
  if (!tenantId || !roomNumber || !identityHash) {
    return res.status(400).json({ ok: false, error: 'tenant_id, room_number, identity_hash required' });
  }
  const result = await verifyGuest({
    tenantId,
    roomNumber,
    identityHash,
    name: req.body?.name,
    tc: req.body?.tc,
    passport: req.body?.passport,
  });
  res.json(result);
});

router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.body?.tenant_id ?? req.query.tenant_id);
  const roomNumber = String(req.body?.room_number ?? req.query.room_number ?? '').trim();
  const identityHash = String(req.body?.identity_hash ?? req.query.identity_hash ?? '').trim();
  if (!tenantId || !roomNumber || !identityHash) {
    return res.status(400).json({ ok: false, error: 'tenant_id, room_number, identity_hash required' });
  }
  const result = await verifyGuest({
    tenantId,
    roomNumber,
    identityHash,
    name: req.body?.name,
    tc: req.body?.tc,
    passport: req.body?.passport,
  });
  const radiusAttrs = getRadiusAttributes({
    sessionTimeoutSeconds: result.session_timeout_seconds,
    validUntil: result.valid_until,
  });
  res.json({ ...result, radius_attributes: radiusAttrs });
});

router.get('/dashboard', (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.query.tenant_id);
  if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });

  const settings = getTenantPmsSettings(tenantId);
  const circuit = getCircuitStatus(tenantId);
  const metrics = getMetrics(tenantId);
  const cacheStats = getCacheStats(tenantId);
  const verifications = getLastVerifications(tenantId, 50);
  const jobStatus = getCheckoutJobStatus();

  const hitRate =
    metrics && metrics.total_verifications > 0
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
    circuitCountdownMs: getRemainingDisabledMs(tenantId),
    jobStatus,
  });
});

router.get('/job-status', (req: Request, res: Response) => {
  res.json(getCheckoutJobStatus());
});

router.post('/settings', (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.body?.tenant_id ?? req.query.tenant_id);
  if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
  const kv = req.body?.settings ?? req.body;
  setTenantPmsSettingsFromKv(tenantId, kv);
  res.json({ ok: true });
});

router.post('/test-connection', async (req: Request, res: Response) => {
  const tenantId = normalizeTenantId(req.body?.tenant_id ?? req.query.tenant_id);
  if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
  const settings = getTenantPmsSettings(tenantId);
  if (!settings || settings.pms_provider === 'none') {
    return res.json({ ok: false, message: 'PMS provider not configured' });
  }
  const connector = getPmsConnector(settings.pms_provider);
  if (!connector) return res.json({ ok: false, message: 'Provider not found' });
  const result = await connector.testConnection(settings);
  res.json(result);
});

export default router;
