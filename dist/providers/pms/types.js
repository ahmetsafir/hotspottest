"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSqlRowToVerify = mapSqlRowToVerify;
function mapSqlRowToVerify(row, settings, provider, latencyMs, cache) {
    const roomCol = settings.pms_sql_room_column || 'room_number';
    const room = (row[roomCol] ?? row.room_number ?? row.room ?? '').toString().trim();
    const checkoutCol = settings.pms_sql_checkout_column;
    const statusCol = settings.pms_sql_status_column;
    const inhouseVal = (settings.pms_sql_inhouse_value ?? 'in_house').toString().toLowerCase();
    const extRefCol = settings.pms_sql_external_ref_column;
    let status = 'unknown';
    let valid_until;
    if (checkoutCol && row[checkoutCol] != null) {
        const checkoutAt = row[checkoutCol] instanceof Date ? row[checkoutCol] : new Date(row[checkoutCol]);
        valid_until = checkoutAt;
        status = checkoutAt.getTime() > Date.now() ? 'in_house' : 'checked_out';
    }
    else if (statusCol != null && row[statusCol] != null) {
        const val = String(row[statusCol]).toLowerCase();
        status = val === inhouseVal ? 'in_house' : 'checked_out';
    }
    const external_ref = extRefCol && row[extRefCol] != null ? String(row[extRefCol]) : undefined;
    const ok = status === 'in_house' || (status === 'unknown' && settings.pms_unknown_mode === 'short_session');
    return {
        matched: true,
        status,
        valid_until,
        external_ref,
        room_number: room,
        provider,
        ok,
        latency_ms: latencyMs,
        cache,
    };
}
//# sourceMappingURL=types.js.map