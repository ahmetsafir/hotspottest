import sql from 'mssql';
import type { TenantPmsSettings } from '../../types/pms';
import type { IPmsConnector } from './types';
import { mapSqlRowToVerify, type RawSqlRow } from './types';
import { PMS_QUERY_TIMEOUT_MS } from '../../types/pms';
import type { GuestVerifyInput, VerifyGuestResult } from '../../types/pms';

export class MssqlPmsConnector implements IPmsConnector {
  async verifyGuest(
    settings: TenantPmsSettings,
    input: GuestVerifyInput
  ): Promise<VerifyGuestResult> {
    const start = Date.now();
    const table = settings.pms_sql_table || 'reservations';
    const roomCol = settings.pms_sql_room_column || 'room_number';

    const config: sql.config = {
      user: settings.pms_db_user,
      password: settings.pms_db_password,
      database: settings.pms_db_database ?? '',
      server: settings.pms_db_host ?? 'localhost',
      port: settings.pms_db_port || 1433,
      options: { encrypt: true, trustServerCertificate: true },
      connectionTimeout: PMS_QUERY_TIMEOUT_MS,
      requestTimeout: PMS_QUERY_TIMEOUT_MS,
    };

    let pool: sql.ConnectionPool | null = null;
    try {
      pool = await sql.connect(config);
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      conditions.push(`[${roomCol}] = @room`);
      params.push(input.roomNumber);

      let paramIndex = 0;
      if (settings.pms_sql_tc_column && input.tc) {
        paramIndex++;
        conditions.push(`[${settings.pms_sql_tc_column}] = @p${paramIndex}`);
        params.push(input.tc);
      }
      if (settings.pms_sql_passport_column && input.passport) {
        paramIndex++;
        conditions.push(`[${settings.pms_sql_passport_column}] = @p${paramIndex}`);
        params.push(input.passport);
      }
      if (settings.pms_sql_name_column && input.name) {
        paramIndex++;
        conditions.push(`[${settings.pms_sql_name_column}] = @p${paramIndex}`);
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
      const selectList = cols.map((c) => `[${c}]`).join(', ');
      const sqlStr = `SELECT ${selectList} FROM [${table}] WHERE ${conditions.join(' AND ')}`;

      const req = pool.request();
      req.input('room', sql.VarChar, input.roomNumber);
      paramIndex = 0;
      if (settings.pms_sql_tc_column && input.tc) {
        paramIndex++;
        req.input(`p${paramIndex}`, sql.VarChar, input.tc);
      }
      if (settings.pms_sql_passport_column && input.passport) {
        paramIndex++;
        req.input(`p${paramIndex}`, sql.VarChar, input.passport);
      }
      if (settings.pms_sql_name_column && input.name) {
        paramIndex++;
        req.input(`p${paramIndex}`, sql.VarChar, input.name);
      }

      const result = await req.query(sqlStr);
      const row = result.recordset?.[0] as RawSqlRow | undefined;
      const latencyMs = Date.now() - start;

      if (!row) {
        return {
          matched: false,
          status: 'unknown',
          room_number: input.roomNumber,
          provider: 'mssql',
          ok: false,
          latency_ms: latencyMs,
          cache: 'miss',
        };
      }

      const keyMap: RawSqlRow = {};
      for (const c of cols) {
        if (row[c] !== undefined) keyMap[c] = row[c];
      }
      return mapSqlRowToVerify(keyMap, settings, 'mssql', latencyMs, 'miss');
    } finally {
      if (pool) await pool.close().catch(() => {});
    }
  }

  async testConnection(settings: TenantPmsSettings): Promise<{ ok: boolean; message?: string }> {
    try {
      const pool = await sql.connect({
        user: settings.pms_db_user,
        password: settings.pms_db_password,
        database: settings.pms_db_database ?? '',
        server: settings.pms_db_host ?? 'localhost',
        port: settings.pms_db_port || 1433,
        options: { encrypt: true, trustServerCertificate: true },
        connectionTimeout: 5000,
      });
      await pool.request().query('SELECT 1');
      await pool.close();
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
