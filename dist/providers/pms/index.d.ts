import type { PmsProvider } from '../../types/pms';
import type { IPmsConnector } from './types';
import { MysqlPmsConnector } from './mysql';
import { MssqlPmsConnector } from './mssql';
import { PostgresPmsConnector } from './postgres';
import { ApiPmsConnector } from './api';
export declare function getPmsConnector(provider: PmsProvider): IPmsConnector | null;
export { MysqlPmsConnector, MssqlPmsConnector, PostgresPmsConnector, ApiPmsConnector };
export type { IPmsConnector, RawSqlRow } from './types';
//# sourceMappingURL=index.d.ts.map