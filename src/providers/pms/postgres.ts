import { Client } from 'pg';
import type { TenantPmsSettings } from '../../types/pms';
import type { IPmsConnector } from './types';
import { mapSqlRowToVerify, type RawSqlRow } from './types';
import { PMS_QUERY_TIMEOUT_MS } from '../../types/pms';
import type { GuestVerifyInput, VerifyGuestResult } from '../../types/pms';

export class PostgresPmsConnector implements IPmsConnector {
  async verifyGuest(
    settings: TenantPmsSettings,
    input: GuestVerifyInput
  ): Promise<VerifyGuestResult> {
    const start = Date.now();
    const table = settings.pms_sql_table || 'reservations';
    const roomCol = settings.pms_sql_room_column || 'room_number';

    const client = new Client({
      host: settings.pms_db_host,
      port: settings.pms_db_port || 5432,
      user: settings.pms_db_user,
      password: settings.pms_db_password,
      database: settings.pms_db_database,
      connectionTimeoutMillis: PMS_QUERY_TIMEOUT_MS,
      statement_timeout: PMS_QUERY_TIMEOUT_MS,
    });

    try {
      await client.connect();
      const conditions: string[] = [];
      const values: (string | number)[] = [];
      let idx = 0;

      idx++;
      conditions.push(`"${roomCol}" = $${idx}`);
      values.push(input.roomNumber);

      if (settings.pms_sql_tc_column && input.tc) {
        idx++;
        conditions.push(`"${settings.pms_sql_tc_column}" = $${idx}`);
        values.push(input.tc);
      }
      if (settings.pms_sql_passport_column && input.passport) {
        idx++;
        conditions.push(`"${settings.pms_sql_passport_column}" = $${idx}`);
        values.push(input.passport);
      }
      if (settings.pms_sql_name_column && input.name) {
        idx++;
        conditions.push(`"${settings.pms_sql_name_column}" = $${idx}`);
        values.push(input.name);
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
      const selectList = cols.map((c) => `"${c}"`).join(', ');
      const sqlStr = `SELECT ${selectList} FROM "${table}" WHERE ${conditions.join(' AND ')} LIMIT 1`;

      const res = await client.query(sqlStr, values);
      const row = res.rows?.[0] as RawSqlRow | undefined;
      const latencyMs = Date.now() - start;

      if (!row) {
        return {
          matched: false,
          status: 'unknown',
          room_number: input.roomNumber,
          provider: 'postgres',
          ok: false,
          latency_ms: latencyMs,
          cache: 'miss',
        };
      }

      const keyMap: RawSqlRow = {};
      for (const c of cols) {
        if (row[c] !== undefined) keyMap[c] = row[c];
      }
      return mapSqlRowToVerify(keyMap, settings, 'postgres', latencyMs, 'miss');
    } finally {
      await client.end().catch(() => {});
    }
  }

  async testConnection(settings: TenantPmsSettings): Promise<{ ok: boolean; message?: string }> {
    const client = new Client({
      host: settings.pms_db_host,
      port: settings.pms_db_port || 5432,
      user: settings.pms_db_user,
      password: settings.pms_db_password,
      database: settings.pms_db_database,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: sanitizeDbError(msg) };
    } finally {
      await client.end().catch(() => {});
    }
  }
}

function sanitizeDbError(msg: string): string {
  return msg.replace(/password[=\s][^\s]+/gi, 'password=***').replace(/'[^']*'/g, (m) => (m.length > 20 ? "'***'" : m));
}
