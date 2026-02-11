"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Migration runner - guest_registrations PMS alanları
 * Kendi DB bağlantınızla çalıştırın veya SQL dosyasını manuel uygulayın.
 */
const fs_1 = require("fs");
const path_1 = require("path");
const migrationPath = (0, path_1.join)(__dirname, 'migrations', '001_guest_registrations_pms.sql');
const sql = (0, fs_1.readFileSync)(migrationPath, 'utf8');
console.log('Migration SQL (MySQL):');
console.log(sql);
console.log('\nPostgreSQL ve MSSQL için docs/OTEL_PMS_ENTEGRASYON.md içindeki örnekleri kullanın.');
//# sourceMappingURL=migrate.js.map