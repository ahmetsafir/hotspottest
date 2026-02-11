import { CIRCUIT_FAILURE_THRESHOLD, CIRCUIT_DISABLE_DURATION_MS } from '../types/pms';

const state: Record<string, { failures: number; disabledUntil: number }> = {};

export function recordSuccess(tenantId: string): void {
  if (state[tenantId]) {
    state[tenantId].failures = 0;
  }
}

export function recordFailure(tenantId: string): void {
  if (!state[tenantId]) state[tenantId] = { failures: 0, disabledUntil: 0 };
  const s = state[tenantId];
  s.failures += 1;
  if (s.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    s.disabledUntil = Date.now() + CIRCUIT_DISABLE_DURATION_MS;
  }
}

export function isCircuitOpen(tenantId: string): boolean {
  const s = state[tenantId];
  if (!s) return false;
  if (s.disabledUntil <= Date.now()) {
    s.disabledUntil = 0;
    s.failures = 0;
    return false;
  }
  return true;
}

export function getCircuitStatus(tenantId: string): { open: boolean; disabledUntil?: number; failures: number } {
  const s = state[tenantId];
  if (!s) return { open: false, failures: 0 };
  const open = s.disabledUntil > Date.now();
  return {
    open,
    disabledUntil: open ? s.disabledUntil : undefined,
    failures: s.failures,
  };
}

export function getRemainingDisabledMs(tenantId: string): number {
  const s = state[tenantId];
  if (!s || s.disabledUntil <= Date.now()) return 0;
  return Math.max(0, s.disabledUntil - Date.now());
}
