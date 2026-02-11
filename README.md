# PMS Gateway

Türkiye’deki otel PMS sistemleriyle (API, MySQL, MSSQL, PostgreSQL) uyumlu, check-in/out destekli, RADIUS kontrollü, MikroTik uyumlu, izlenebilir ve dashboard’lu SaaS PMS Gateway.

## Özellikler

- **Provider-based PMS:** API (REST), MySQL, MSSQL, PostgreSQL
- **Check-in/out kuralları:** in_house / checked_out / unknown, valid_until, short_session
- **RADIUS:** Session-Timeout, Expiration (DD Mon YYYY HH:MM:SS)
- **MikroTik:** Hotspot active/cookie remove (SSH)
- **Circuit breaker:** 5 hata → 2 dk disable
- **Cache:** tenantId:room:identityHash, TTL 5 dk
- **Checkout job:** 10 dk’da bir, checkout olan kullanıcıları kapatma
- **Dashboard:** Provider, circuit, latency, cache hit rate, son 50 doğrulama
- **Rate limit:** test-verify 10/dk, login 30/dk

## Kurulum

```bash
npm install
npm run build
```

## Çalıştırma

```bash
npm run dev    # geliştirme
npm start      # production (dist)
```

## Ortam

- `PORT` – Sunucu portu (varsayılan 3000)

## Endpoint’ler

- `GET /api/pms/health?tenant_id=...`
- `GET /api/pms/metrics?tenant_id=...`
- `GET /api/pms/circuit-status?tenant_id=...`
- `POST /api/pms/test-verify` – body: tenant_id, room_number, identity_hash
- `POST /api/pms/login` – aynı + radius_attributes döner
- `GET /api/pms/dashboard?tenant_id=...`
- `GET /api/pms/job-status`
- `POST /api/pms/settings` – tenant PMS ayarları
- `POST /api/pms/test-connection` – bağlantı testi

**Client panel:** http://localhost:3000/panel

## Migration

`src/migrations/001_guest_registrations_pms.sql` – guest_registrations tablosuna pms_provider, pms_verified, pms_latency_ms, stay_status, valid_until ekler. Kendi veritabanınızda ilgili DB’ye uygun bloğu çalıştırın.

## Dokümantasyon

- [Otel PMS Entegrasyonu](docs/OTEL_PMS_ENTEGRASYON.md) – MySQL/MSSQL/PostgreSQL/API örnek config, RADIUS, MikroTik, diyagram
- [Çıktı Özeti](docs/CIKTI_OZET.md) – Dosya listesi, örnek sorgular, test adımları

## Test

```bash
npm test
```

Senaryolar: in_house login, checked_out login, unknown+short_session, unknown+deny, circuit breaker, cache hit, RADIUS format, MikroTik drop (mock).
