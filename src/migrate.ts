/**
 * Migration runner - guest_registrations PMS alanları
 * Kendi DB bağlantınızla çalıştırın veya SQL dosyasını manuel uygulayın.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const migrationPath = join(__dirname, 'migrations', '001_guest_registrations_pms.sql');
const sql = readFileSync(migrationPath, 'utf8');
console.log('Migration SQL (MySQL):');
console.log(sql);
console.log('\nPostgreSQL ve MSSQL için docs/OTEL_PMS_ENTEGRASYON.md içindeki örnekleri kullanın.');
