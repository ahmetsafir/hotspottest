import type { VerifyGuestResult, VerificationLogEntry } from '../types/pms';

const logs: VerificationLogEntry[] = [];
const MAX_LOGS = 500;

export function recordVerificationLog(tenantId: string, result: VerifyGuestResult): void {
  const entry: VerificationLogEntry = {
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
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
}

export function getLastVerifications(tenantId: string, limit = 50): VerificationLogEntry[] {
  return logs.filter((e) => e.tenant_id === tenantId).slice(0, limit);
}

export function getVerificationLogs(tenantId?: string): VerificationLogEntry[] {
  if (!tenantId) return [...logs].slice(0, 100);
  return logs.filter((e) => e.tenant_id === tenantId);
}
