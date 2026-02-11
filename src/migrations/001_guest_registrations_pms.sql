-- PMS Gateway: guest_registrations tablosuna PMS alanları
-- Çalıştırma: mevcut veritabanınızda bu SQL'i çalıştırın (MySQL / PostgreSQL / MSSQL uyumlu sözdizimi ayrı ayrı verilebilir).

-- MySQL / MariaDB:
ALTER TABLE guest_registrations
  ADD COLUMN IF NOT EXISTS pms_provider VARCHAR(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pms_verified TINYINT(1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pms_latency_ms INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stay_status VARCHAR(32) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valid_until DATETIME DEFAULT NULL;

-- PostgreSQL:
-- ALTER TABLE guest_registrations
--   ADD COLUMN IF NOT EXISTS pms_provider VARCHAR(32) DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS pms_verified BOOLEAN DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS pms_latency_ms INT DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS stay_status VARCHAR(32) DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP DEFAULT NULL;

-- MSSQL:
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('guest_registrations') AND name = 'pms_provider')
--   ALTER TABLE guest_registrations ADD pms_provider NVARCHAR(32) NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('guest_registrations') AND name = 'pms_verified')
--   ALTER TABLE guest_registrations ADD pms_verified BIT NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('guest_registrations') AND name = 'pms_latency_ms')
--   ALTER TABLE guest_registrations ADD pms_latency_ms INT NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('guest_registrations') AND name = 'stay_status')
--   ALTER TABLE guest_registrations ADD stay_status NVARCHAR(32) NULL;
-- IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('guest_registrations') AND name = 'valid_until')
--   ALTER TABLE guest_registrations ADD valid_until DATETIME2 NULL;
