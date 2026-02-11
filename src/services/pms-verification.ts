import type { GuestVerifyInput, VerifyGuestResult, TenantPmsSettings } from '../types/pms';
import { getPmsConnector } from '../providers/pms';
import { getTenantPmsSettings } from './tenant-settings';
import { isCircuitOpen, recordSuccess, recordFailure } from './circuit-breaker';
import { getCached, setCached } from './verification-cache';
import { recordVerificationLog } from './verification-log';
import { recordMetrics } from './metrics';

export function applyLoginRules(result: VerifyGuestResult, settings: TenantPmsSettings): VerifyGuestResult {
  let ok = result.ok;
  if (!result.matched) {
    ok = false;
  } else if (result.status === 'checked_out') {
    ok = false;
  } else if (result.valid_until && result.valid_until.getTime() < Date.now()) {
    ok = false;
  } else if (result.status === 'in_house') {
    ok = true;
  } else if (result.status === 'unknown') {
    ok = settings.pms_unknown_mode === 'short_session';
    if (ok) {
      result.session_timeout_seconds = Math.min(
        settings.pms_session_timeout_minutes * 60,
        1440 * 60
      );
    }
  }
  return { ...result, ok };
}

export async function verifyGuest(input: GuestVerifyInput): Promise<VerifyGuestResult> {
  const settings = getTenantPmsSettings(input.tenantId);
  const failMode = settings?.pms_fail_mode ?? 'deny';
  const unknownMode = settings?.pms_unknown_mode ?? 'deny';

  const defaultFail = (provider: VerifyGuestResult['provider'], latencyMs: number): VerifyGuestResult => ({
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
    recordVerificationLog(input.tenantId, res);
    recordMetrics(input.tenantId, res, 'deny');
    return res;
  }

  const cached = getCached(input.tenantId, input.roomNumber, input.identityHash);
  if (cached) {
    recordVerificationLog(input.tenantId, cached);
    recordMetrics(input.tenantId, cached, null);
    return cached;
  }

  if (isCircuitOpen(input.tenantId)) {
    const res = defaultFail(settings.pms_provider, 0);
    recordVerificationLog(input.tenantId, res);
    recordMetrics(input.tenantId, res, failMode === 'bypass' ? 'bypass' : 'deny');
    return res;
  }

  const connector = getPmsConnector(settings.pms_provider);
  if (!connector) {
    const res = defaultFail(settings.pms_provider, 0);
    recordVerificationLog(input.tenantId, res);
    recordMetrics(input.tenantId, res, 'deny');
    return res;
  }

  const start = Date.now();
  let result: VerifyGuestResult;
  try {
    result = await connector.verifyGuest(settings, input);
    recordSuccess(input.tenantId);
  } catch (e) {
    recordFailure(input.tenantId);
    const latencyMs = Date.now() - start;
    result = defaultFail(settings.pms_provider, latencyMs);
    recordVerificationLog(input.tenantId, result);
    recordMetrics(input.tenantId, result, failMode === 'bypass' ? 'bypass' : 'deny');
    return result;
  }

  result = applyLoginRules(result, settings);
  if (result.ok && result.matched) {
    setCached(input.tenantId, input.roomNumber, input.identityHash, result);
  }

  recordVerificationLog(input.tenantId, result);
  recordMetrics(input.tenantId, result, null);
  return result;
}
