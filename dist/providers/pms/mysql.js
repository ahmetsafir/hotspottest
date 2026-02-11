"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MysqlPmsConnector = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const types_1 = require("./types");
const pms_1 = require("../../types/pms");
class MysqlPmsConnector {
    async verifyGuest(settings, input) {
        const start = Date.now();
        const table = settings.pms_sql_table || 'reservations';
        const roomCol = settings.pms_sql_room_column || 'room_number';
        const dbConfig = {
            host: settings.pms_db_host,
            port: settings.pms_db_port || 3306,
            user: settings.pms_db_user,
            password: settings.pms_db_password,
            database: settings.pms_db_database,
            connectTimeout: pms_1.PMS_QUERY_TIMEOUT_MS,
        };
        let conn = null;
        try {
            conn = await promise_1.default.createConnection(dbConfig);
            const conditions = [];
            const params = [];
            conditions.push(`\`${roomCol}\` = ?`);
            params.push(input.roomNumber);
            if (settings.pms_sql_tc_column && input.tc) {
                conditions.push(`\`${settings.pms_sql_tc_column}\` = ?`);
                params.push(input.tc);
            }
            if (settings.pms_sql_passport_column && input.passport) {
                conditions.push(`\`${settings.pms_sql_passport_column}\` = ?`);
                params.push(input.passport);
            }
            if (settings.pms_sql_name_column && input.name) {
                conditions.push(`\`${settings.pms_sql_name_column}\` = ?`);
                params.push(input.name);
            }
            const cols = [
                roomCol,
                settings.pms_sql_name_column,
                settings.pms_sql_tc_column,
                settings.pms_sql_passport_column,
                settings.pms_sql_checkin_column,
                settings.pms_sql_checkout_column,
                settings.pms_sql_status_column,
                settings.pms_sql_external_ref_column,
            ].filter(Boolean);
            const selectList = cols.map((c) => `\`${c}\``).join(', ');
            const sql = `SELECT ${selectList} FROM \`${table}\` WHERE ${conditions.join(' AND ')} LIMIT 1`;
            const [rows] = await conn.execute({ sql, values: params, timeout: pms_1.PMS_QUERY_TIMEOUT_MS });
            const arr = Array.isArray(rows) ? rows : rows;
            const row = arr[0];
            const latencyMs = Date.now() - start;
            if (!row) {
                return {
                    matched: false,
                    status: 'unknown',
                    room_number: input.roomNumber,
                    provider: 'mysql',
                    ok: false,
                    latency_ms: latencyMs,
                    cache: 'miss',
                };
            }
            const keyMap = {};
            for (const c of cols) {
                if (row[c] !== undefined)
                    keyMap[c] = row[c];
            }
            return (0, types_1.mapSqlRowToVerify)(keyMap, settings, 'mysql', latencyMs, 'miss');
        }
        finally {
            if (conn)
                await conn.end().catch(() => { });
        }
    }
    async testConnection(settings) {
        try {
            const conn = await promise_1.default.createConnection({
                host: settings.pms_db_host,
                port: settings.pms_db_port || 3306,
                user: settings.pms_db_user,
                password: settings.pms_db_password,
                database: settings.pms_db_database,
                connectTimeout: 5000,
            });
            await conn.ping();
            await conn.end();
            return { ok: true };
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return { ok: false, message: sanitizeDbError(msg) };
        }
    }
}
exports.MysqlPmsConnector = MysqlPmsConnector;
function sanitizeDbError(msg) {
    return msg.replace(/password[=\s][^\s]+/gi, 'password=***').replace(/'[^']*'/g, (m) => (m.length > 20 ? "'***'" : m));
}
//# sourceMappingURL=mysql.js.map