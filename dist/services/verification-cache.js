"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCached = getCached;
exports.setCached = setCached;
exports.getCacheStats = getCacheStats;
const pms_1 = require("../types/pms");
const cache = new Map();
function cacheKey(tenantId, roomNumber, identityHash) {
    return `${tenantId}:${roomNumber}:${identityHash}`;
}
function getCached(tenantId, roomNumber, identityHash) {
    const key = cacheKey(tenantId, roomNumber, identityHash);
    const entry = cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
        if (entry)
            cache.delete(key);
        return null;
    }
    return { ...entry.result, cache: 'hit' };
}
function setCached(tenantId, roomNumber, identityHash, result) {
    if (!result.ok || !result.matched)
        return;
    const key = cacheKey(tenantId, roomNumber, identityHash);
    cache.set(key, {
        result: { ...result, cache: 'miss' },
        expiresAt: Date.now() + pms_1.CACHE_TTL_SECONDS * 1000,
    });
}
function getCacheStats(tenantId) {
    const now = Date.now();
    let hits = 0;
    let misses = 0;
    let keys = 0;
    for (const [key, entry] of cache.entries()) {
        if (entry.expiresAt <= now) {
            cache.delete(key);
            continue;
        }
        if (tenantId && !key.startsWith(tenantId + ':'))
            continue;
        keys++;
        if (entry.result.cache === 'hit')
            hits++;
        else
            misses++;
    }
    return { hits, misses, keys };
}
//# sourceMappingURL=verification-cache.js.map