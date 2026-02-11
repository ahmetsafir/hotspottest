import type { VerifyGuestResult } from '../types/pms';
import { CACHE_TTL_SECONDS } from '../types/pms';

interface CacheEntry {
  result: VerifyGuestResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(tenantId: string, roomNumber: string, identityHash: string): string {
  return `${tenantId}:${roomNumber}:${identityHash}`;
}

export function getCached(
  tenantId: string,
  roomNumber: string,
  identityHash: string
): VerifyGuestResult | null {
  const key = cacheKey(tenantId, roomNumber, identityHash);
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) cache.delete(key);
    return null;
  }
  return { ...entry.result, cache: 'hit' as const };
}

export function setCached(
  tenantId: string,
  roomNumber: string,
  identityHash: string,
  result: VerifyGuestResult
): void {
  if (!result.ok || !result.matched) return;
  const key = cacheKey(tenantId, roomNumber, identityHash);
  cache.set(key, {
    result: { ...result, cache: 'miss' },
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
  });
}

export function getCacheStats(tenantId?: string): { hits: number; misses: number; keys: number } {
  const now = Date.now();
  let hits = 0;
  let misses = 0;
  let keys = 0;
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
      continue;
    }
    if (tenantId && !key.startsWith(tenantId + ':')) continue;
    keys++;
    if (entry.result.cache === 'hit') hits++;
    else misses++;
  }
  return { hits, misses, keys };
}
