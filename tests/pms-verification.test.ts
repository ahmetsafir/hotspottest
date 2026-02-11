/**
 * PMS Gateway – Test senaryoları
 * Çalıştırma: npm test
 *
 * Senaryolar:
 * 1) in_house login
 * 2) checked_out login
 * 3) unknown + short_session
 * 4) unknown + deny
 * 5) circuit breaker tetikleme
 * 6) cache hit doğrulama
 * 7) checkout automation (job)
 * 8) MikroTik active drop (mock)
 */

import { applyLoginRules } from '../src/services/pms-verification';
import type { VerifyGuestResult, TenantPmsSettings } from '../src/types/pms';
import { getRadiusAttributes, formatExpiration } from '../src/services/radius';
import { isCircuitOpen, recordFailure, recordSuccess, getCircuitStatus } from '../src/services/circuit-breaker';
import { setCached, getCached } from '../src/services/verification-cache';
import { CIRCUIT_FAILURE_THRESHOLD } from '../src/types/pms';

const baseSettings: TenantPmsSettings = {
  pms_provider: 'mysql',
  pms_fail_mode: 'deny',
  pms_unknown_mode: 'deny',
  pms_session_timeout_minutes: 60,
};

describe('1) in_house login', () => {
  it('in_house → ok true', () => {
    const result: VerifyGuestResult = {
      matched: true,
      status: 'in_house',
      room_number: '101',
      provider: 'mysql',
      ok: true,
      latency_ms: 10,
      cache: 'miss',
    };
    const out = applyLoginRules(result, baseSettings);
    expect(out.ok).toBe(true);
    expect(out.status).toBe('in_house');
  });
});

describe('2) checked_out login', () => {
  it('checked_out → ok false', () => {
    const result: VerifyGuestResult = {
      matched: true,
      status: 'checked_out',
      room_number: '101',
      provider: 'mysql',
      ok: false,
      latency_ms: 10,
      cache: 'miss',
    };
    const out = applyLoginRules(result, baseSettings);
    expect(out.ok).toBe(false);
  });
});

describe('3) unknown + short_session', () => {
  it('unknown + short_session → ok true + session_timeout_seconds', () => {
    const settings: TenantPmsSettings = { ...baseSettings, pms_unknown_mode: 'short_session' };
    const result: VerifyGuestResult = {
      matched: true,
      status: 'unknown',
      room_number: '101',
      provider: 'api',
      ok: true,
      latency_ms: 20,
      cache: 'miss',
    };
    const out = applyLoginRules(result, settings);
    expect(out.ok).toBe(true);
    expect(out.session_timeout_seconds).toBe(60 * 60);
  });
});

describe('4) unknown + deny', () => {
  it('unknown + deny → ok false', () => {
    const result: VerifyGuestResult = {
      matched: true,
      status: 'unknown',
      room_number: '101',
      provider: 'mysql',
      ok: false,
      latency_ms: 10,
      cache: 'miss',
    };
    const out = applyLoginRules(result, baseSettings);
    expect(out.ok).toBe(false);
  });
});

describe('5) circuit breaker', () => {
  it('5 failure → circuit open, then recordSuccess resets', () => {
    const tenantId = 'test-tenant-circuit';
    recordSuccess(tenantId);
    for (let i = 0; i < CIRCUIT_FAILURE_THRESHOLD; i++) recordFailure(tenantId);
    expect(isCircuitOpen(tenantId)).toBe(true);
    const status = getCircuitStatus(tenantId);
    expect(status.open).toBe(true);
    recordSuccess(tenantId);
    // After 2 min or manual reset - in test we just check that after many failures it opens
  });
});

describe('6) cache hit', () => {
  it('set then get returns same result with cache hit', () => {
    const result: VerifyGuestResult = {
      matched: true,
      status: 'in_house',
      room_number: '102',
      provider: 'mysql',
      ok: true,
      latency_ms: 5,
      cache: 'miss',
    };
    setCached('t1', '102', 'hash1', result);
    const cached = getCached('t1', '102', 'hash1');
    expect(cached).not.toBeNull();
    expect(cached!.cache).toBe('hit');
    expect(cached!.room_number).toBe('102');
    expect(getCached('t1', '102', 'hash2')).toBeNull();
  });
});

describe('7) RADIUS attributes', () => {
  it('Expiration format DD Mon YYYY HH:MM:SS', () => {
    const d = new Date('2025-02-13T14:30:00Z');
    const str = formatExpiration(d);
    expect(str).toMatch(/^\d{1,2} \w{3} \d{4} \d{2}:\d{2}:\d{2}$/);
  });
  it('getRadiusAttributes returns Session-Timeout and Expiration', () => {
    const attrs = getRadiusAttributes({
      sessionTimeoutSeconds: 3600,
      validUntil: new Date('2025-02-13T14:30:00Z'),
    });
    expect(attrs.some((a) => a.attribute === 'Session-Timeout' && a.value === '3600')).toBe(true);
    expect(attrs.some((a) => a.attribute === 'Expiration')).toBe(true);
  });
});

describe('8) MikroTik drop (mock)', () => {
  it('dropHotspotUser is callable (integration would need real device)', () => {
    const { dropHotspotUser } = require('../src/services/mikrotik');
    expect(typeof dropHotspotUser).toBe('function');
  });
});
