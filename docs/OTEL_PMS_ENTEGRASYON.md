# Otel PMS Entegrasyonu – PMS Gateway

Türkiye’deki otel PMS sistemleriyle (API, MySQL, MSSQL, PostgreSQL) uyumlu, check-in/out destekli, RADIUS kontrollü, MikroTik uyumlu PMS Gateway dokümantasyonu.

---

## 1. Genel mimari

- **Provider-based PMS Connector**: API, MySQL, MSSQL, PostgreSQL.
- **Ortak doğrulama sonucu** (`verifyGuest`):

```json
{
  "matched": true,
  "status": "in_house",
  "valid_until": "2025-02-13T12:00:00.000Z",
  "external_ref": "RES-123",
  "room_number": "101",
  "provider": "mysql",
  "ok": true,
  "session_timeout_seconds": 3600,
  "latency_ms": 45,
  "cache": "miss"
}
```

- **Tenant ayarları**: Key/value (pms_provider, pms_fail_mode, pms_unknown_mode, pms_session_timeout_minutes, pms_db_*, pms_sql_*, pms_api_*).

---

## 2. Check-in / Check-out yaşam döngüsü

| Koşul | Login |
|--------|--------|
| `matched = false` | Red |
| `matched = true` + `status = 'checked_out'` | Red |
| `matched = true` + `valid_until < now` | Red |
| `matched = true` + `status = 'in_house'` | OK |
| `matched = true` + `status = 'unknown'` + unknown_mode = `deny` | Red |
| `matched = true` + `status = 'unknown'` + unknown_mode = `short_session` | OK + Session-Timeout |

**SQL tarafı:**

- **checkout_at** varsa: `valid_until = checkout_at`, `status = checkout_at > now ? 'in_house' : 'checked_out'`
- **status** sütunu varsa: `status = (value === inhouse_value) ? 'in_house' : 'checked_out'`
- İkisi de yoksa: `status = 'unknown'`

**API tarafı:** `status`, `checkout_at`, `reservation_id` normalize edilir.

---

## 3. MySQL örnek config

```json
{
  "pms_provider": "mysql",
  "pms_fail_mode": "deny",
  "pms_unknown_mode": "short_session",
  "pms_session_timeout_minutes": 60,
  "pms_db_host": "192.168.1.10",
  "pms_db_port": 3306,
  "pms_db_user": "pms_read",
  "pms_db_password": "***",
  "pms_db_database": "hotel_pms",
  "pms_sql_table": "reservations",
  "pms_sql_room_column": "room_number",
  "pms_sql_name_column": "guest_name",
  "pms_sql_tc_column": "tc_no",
  "pms_sql_passport_column": "passport_no",
  "pms_sql_checkin_column": "checkin_at",
  "pms_sql_checkout_column": "checkout_at",
  "pms_sql_status_column": "status",
  "pms_sql_inhouse_value": "in_house",
  "pms_sql_external_ref_column": "reservation_id"
}
```

**Örnek tablo (MySQL):**

```sql
CREATE TABLE reservations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_number VARCHAR(20) NOT NULL,
  guest_name VARCHAR(255),
  tc_no VARCHAR(20),
  passport_no VARCHAR(50),
  checkin_at DATETIME,
  checkout_at DATETIME,
  status VARCHAR(32),
  reservation_id VARCHAR(64),
  INDEX (room_number),
  INDEX (checkout_at)
);
```

**Örnek parametreli sorgu (uygulama tarafında):**

```sql
SELECT `room_number`, `guest_name`, `checkout_at`, `status`, `reservation_id`
FROM `reservations`
WHERE `room_number` = ?
LIMIT 1
```

---

## 4. MSSQL örnek config

```json
{
  "pms_provider": "mssql",
  "pms_fail_mode": "deny",
  "pms_unknown_mode": "deny",
  "pms_session_timeout_minutes": 120,
  "pms_db_host": "192.168.1.20",
  "pms_db_port": 1433,
  "pms_db_user": "pms_user",
  "pms_db_password": "***",
  "pms_db_database": "HotelPMS",
  "pms_sql_table": "Reservations",
  "pms_sql_room_column": "RoomNo",
  "pms_sql_checkout_column": "CheckOutDate",
  "pms_sql_status_column": "StayStatus",
  "pms_sql_inhouse_value": "InHouse"
}
```

**Örnek parametreli sorgu:**

```sql
SELECT [RoomNo], [CheckOutDate], [StayStatus]
FROM [Reservations]
WHERE [RoomNo] = @room
```

---

## 5. PostgreSQL örnek config

```json
{
  "pms_provider": "postgres",
  "pms_fail_mode": "bypass",
  "pms_unknown_mode": "short_session",
  "pms_session_timeout_minutes": 60,
  "pms_db_host": "192.168.1.30",
  "pms_db_port": 5432,
  "pms_db_user": "pms_ro",
  "pms_db_password": "***",
  "pms_db_database": "hotel_pms",
  "pms_sql_table": "reservations",
  "pms_sql_room_column": "room_number",
  "pms_sql_checkout_column": "checkout_at",
  "pms_sql_status_column": "status",
  "pms_sql_inhouse_value": "in_house"
}
```

**Örnek parametreli sorgu:**

```sql
SELECT "room_number", "checkout_at", "status"
FROM "reservations"
WHERE "room_number" = $1
LIMIT 1
```

---

## 6. API örnek response

PMS tarafı REST ile doğrulama sağlıyorsa, örnek yanıt:

```json
{
  "room_number": "101",
  "status": "in_house",
  "checkout_at": "2025-02-13T12:00:00.000Z",
  "reservation_id": "RES-456",
  "in_house": true
}
```

Gateway bu alanları normalize eder: `status` → in_house/checked_out/unknown, `checkout_at` → valid_until.

---

## 7. RADIUS attribute örneği

- **Session-Timeout** (saniye): Unknown + short_session için.
- **Expiration**: `valid_until` varsa radcheck/radreply’de kullanılır.

**Format:** `DD Mon YYYY HH:MM:SS`  
Örnek: `13 Feb 2025 14:30:00`

**radreply örneği:**

```
Session-Timeout=3600
Expiration=13 Feb 2025 14:30:00
```

---

## 8. MikroTik gereksinimleri

Checkout algılandığında oturumu kapatmak için:

- **Hotspot active session:** kullanıcı oturumunu kaldır.
- **Hotspot cookie:** ilgili cookie’yi kaldır.

**Komutlar (MikroTik):**

```
/ip hotspot active remove [find user="<username>"]
/ip hotspot cookie remove [find user="<username>"]
```

**Gereksinimler:**

- MikroTik’e SSH veya API erişimi (host, port 22, kullanıcı/şifre veya key).
- Gateway’de MikroTik konfigürasyonu (tenant bazlı): host, port, username, password/privateKey.

Opsiyonel: RADIUS Disconnect (CoA) ile aynı kullanıcıyı kapatma.

---

## 9. Diyagram – Check-in/out akışı

```
[Login isteği]
      |
      v
[Cache?] --> hit --> [RADIUS Session-Timeout/Expiration] --> Login OK
      |
      miss
      v
[Circuit açık?] --> evet --> fail_mode --> bypass --> Login OK
      |                        deny  --> Login Red
      hayır
      v
[PMS Provider: API/MySQL/MSSQL/Postgres]
      |
      v
[matched?] --> hayır --> Login Red
      |
      evet
      v
[status?]
  checked_out --> Login Red
  valid_until < now --> Login Red
  in_house --> Login OK + Expiration
  unknown --> unknown_mode
               deny --> Login Red
               short_session --> Login OK + Session-Timeout
```

---

## 10. Health endpoint’leri

- `GET /api/pms/health?tenant_id=...` – PMS sağlık
- `GET /api/pms/metrics?tenant_id=...` – Metrikler
- `GET /api/pms/circuit-status?tenant_id=...` – Circuit breaker durumu

---

## 11. Güvenlik

- Tüm SQL sorguları **parametreli** (SQL injection yok).
- Secret’lar loglanmaz; DB hata mesajları sanitize edilir.
- Rate limit: test-verify 10/dk, login 30/dk.
- PMS sorgu timeout: 5 saniye.
- Maksimum session timeout: 1440 dakika.
