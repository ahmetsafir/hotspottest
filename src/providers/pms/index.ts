import type { PmsProvider } from '../../types/pms';
import type { IPmsConnector } from './types';
import { MysqlPmsConnector } from './mysql';
import { MssqlPmsConnector } from './mssql';
import { PostgresPmsConnector } from './postgres';
import { ApiPmsConnector } from './api';

const connectors: Record<Exclude<PmsProvider, 'none'>, IPmsConnector> = {
  mysql: new MysqlPmsConnector(),
  mssql: new MssqlPmsConnector(),
  postgres: new PostgresPmsConnector(),
  api: new ApiPmsConnector(),
};

export function getPmsConnector(provider: PmsProvider): IPmsConnector | null {
  if (provider === 'none') return null;
  return connectors[provider] ?? null;
}

export { MysqlPmsConnector, MssqlPmsConnector, PostgresPmsConnector, ApiPmsConnector };
export type { IPmsConnector, RawSqlRow } from './types';
