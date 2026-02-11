"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiPmsConnector = exports.PostgresPmsConnector = exports.MssqlPmsConnector = exports.MysqlPmsConnector = void 0;
exports.getPmsConnector = getPmsConnector;
const mysql_1 = require("./mysql");
Object.defineProperty(exports, "MysqlPmsConnector", { enumerable: true, get: function () { return mysql_1.MysqlPmsConnector; } });
const mssql_1 = require("./mssql");
Object.defineProperty(exports, "MssqlPmsConnector", { enumerable: true, get: function () { return mssql_1.MssqlPmsConnector; } });
const postgres_1 = require("./postgres");
Object.defineProperty(exports, "PostgresPmsConnector", { enumerable: true, get: function () { return postgres_1.PostgresPmsConnector; } });
const api_1 = require("./api");
Object.defineProperty(exports, "ApiPmsConnector", { enumerable: true, get: function () { return api_1.ApiPmsConnector; } });
const connectors = {
    mysql: new mysql_1.MysqlPmsConnector(),
    mssql: new mssql_1.MssqlPmsConnector(),
    postgres: new postgres_1.PostgresPmsConnector(),
    api: new api_1.ApiPmsConnector(),
};
function getPmsConnector(provider) {
    if (provider === 'none')
        return null;
    return connectors[provider] ?? null;
}
//# sourceMappingURL=index.js.map