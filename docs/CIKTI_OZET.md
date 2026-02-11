# PMS Gateway – Çıktı Özeti (O)

## Değişen / Eklenen Dosya Listesi

```
package.json
tsconfig.json
src/types/pms.ts
src/providers/pms/types.ts
src/providers/pms/mysql.ts
src/providers/pms/mssql.ts
src/providers/pms/postgres.ts
src/providers/pms/api.ts
src/providers/pms/index.ts
src/services/tenant-settings.ts
src/services/circuit-breaker.ts
src/services/verification-cache.ts
src/services/verification-log.ts
src/services/metrics.ts
src/services/pms-verification.ts
src/services/radius.ts
src/services/mikrotik.ts
src/services/changed-stays.ts
src/jobs/checkout-automation.ts
src/routes/pms.ts
src/app.ts
src/index.ts
src/migrate.ts
src/migrations/001_guest_registrations_pms.sql
public/index.html
docs/OTEL_PMS_ENTEGRASYON.md
docs/CIKTI_OZET.md
tests/pms-verification.test.ts
jest.config.js
```

---

## Provider Bazlı Örnek Sorgu

### MySQL
```sql
SELECT `room_number`, `guest_name`, `checkout_at`, `status`, `reservation_id`
FROM `reservations`
WHERE `room_number` = ?
LIMIT 1
```

### MSSQL
```sql
SELECT [RoomNo], [CheckOutDate], [StayStatus], [ReservationId]
FROM [Reservations]
WHERE [RoomNo] = @room
```

### PostgreSQL
```sql
SELECT "room_number", "checkout_at", "status", "external_ref"
FROM "reservations"
WHERE "room_number" = $1
LIMIT 1
```

### API (REST)
```
POST /verify
Content-Type: application/json
Body: { "room_number": "101", "name": "...", "tc": "...", "passport": "...", "identity_hash": "..." }
```

---

## RADIUS Attribute Örneği

**radreply (login OK):**
```
Session-Timeout=3600
Expiration=13 Feb 2025 14:30:00
```

**Expiration format:** `DD Mon YYYY HH:MM:SS`

**guest_registrations alanları:**  
`pms_provider`, `pms_verified`, `pms_latency_ms`, `stay_status`, `valid_until`

---

## MikroTik Drop Örneği

**Komutlar:**
```
/ip hotspot active remove [find user="<username>"]
/ip hotspot cookie remove [find user="<username>"]
```

**Kod (SSH):** `src/services/mikrotik.ts` – `dropHotspotUser(config, username)`

---

## Test Adımları

1. **in_house login** – `status=in_house` → login OK.
2. **checked_out login** – `status=checked_out` → login red.
3. **unknown + short_session** – unknown_mode=short_session → OK + Session-Timeout.
4. **unknown + deny** – unknown_mode=deny → login red.
5. **Circuit breaker** – 5 ardışık hata → circuit açılır, 2 dk provider çağrılmaz.
6. **Cache hit** – Aynı tenant/oda/identityHash 5 dk içinde tekrar → cache hit, PMS çağrılmaz.
7. **Checkout automation** – 10 dk’da bir job; checkout olan kullanıcılar için RADIUS Expiration güncelleme + MikroTik drop.
8. **MikroTik active drop** – `dropHotspotUser()` ile kullanıcı oturumu kapatma (entegrasyon testi için gerçek cihaz gerekir).

**Çalıştırma:** `npm test`

---

## Endpoint Özeti

| Endpoint | Açıklama |
|----------|-----------|
| GET /api/pms/health | PMS sağlık |
| GET /api/pms/metrics | Metrikler (tenant_id opsiyonel) |
| GET /api/pms/circuit-status | Circuit durumu |
| POST /api/pms/test-verify | Doğrulama testi (10/dk) |
| POST /api/pms/login | Login doğrulama (30/dk) |
| GET /api/pms/dashboard | Dashboard verisi |
| GET /api/pms/job-status | Checkout job durumu |
| POST /api/pms/settings | Tenant PMS ayarları |
| POST /api/pms/test-connection | Bağlantı testi |

**Client panel:** `/panel` veya `/panel/index.html`
