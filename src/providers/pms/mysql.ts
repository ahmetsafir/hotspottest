import mysql from 'mysql2/promise';
import type { TenantPmsSettings } from '../../types/pms';
import type { IPmsConnector } from './types';
import { mapSqlRowToVerify, type RawSqlRow } from './types';
import { PMS_QUERY_TIMEOUT_MS } from '../../types/pms';
import type { GuestVerifyInput, VerifyGuestResult } from '../../types/pms';

export class MysqlPmsConnector implements IPmsConnector {
  async verifyGuest(
    settings: TenantPmsSettings,
    input: GuestVerifyInput
  ): Promise<VerifyGuestResult> {
    const start = Date.now();
    const table = settings.pms_sql_table || 'reservations';
    const roomCol = settings.pms_sql_room_column || 'room_number';
    const dbConfig = {
      host: settings.pms_db_host,
      port: settings.pms_db_port || 3306,
      user: settings.pms_db_user,
      password: settings.pms_db_password,
      database: settings.pms_db_database,
      connectTimeout: PMS_QUERY_TIMEOUT_MS,
    };

    let conn: mysql.Connection | null = null;
    try {
      conn = await mysql.createConnection(dbConfig);
      const conditions: string[] = [];
      const params: (string | number)[] = [];

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
      ].filter(Boolean) as string[];
      const selectList = cols.map((c) => `\`${c}\``).join(', ');
      const sql = `SELECT ${selectList} FROM \`${table}\` WHERE ${conditions.join(' AND ')} LIMIT 1`;

      const [rows] = await conn.execute({ sql, values: params, timeout: PMS_QUERY_TIMEOUT_MS });
      const arr = Array.isArray(rows) ? rows : (rows as unknown as { [key: string]: unknown }[]);
      const row = arr[0] as RawSqlRow | undefined;
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

      const keyMap: RawSqlRow = {};
      for (const c of cols) {
        if (row[c] !== undefined) keyMap[c] = row[c];
      }
      return mapSqlRowToVerify(keyMap, settings, 'mysql', latencyMs, 'miss');
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  }

  async testConnection(settings: TenantPmsSettings): Promise<{ ok: boolean; message?: string }> {
    try {
      const conn = await mysql.createConnection({
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: sanitizeDbError(msg) };
    }
  }
}

function sanitizeDbError(msg: string): string {
  return msg.replace(/password[=\s][^\s]+/gi, 'password=***').replace(/'[^']*'/g, (m) => (m.length > 20 ? "'***'" : m));
}
