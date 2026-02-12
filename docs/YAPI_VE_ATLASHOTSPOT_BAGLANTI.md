# PMS Gateway (pms-lab) Yapısı ve Atlas Hotspot ile Orta Nokta

Bu doküman: (1) Burada yaptığımız **PMS Gateway** sisteminin yapısını, (2) **Atlas Hotspot** ile nerede buluşacağını özetler. Cursor’da Atlas Hotspot’u yaparken buraya referans vererek “orta noktada buluşalım” diyebilirsin.

**Atlas Hotspot tarafında sözleşme:** `docs/PMS_GATEWAY_ORTA_NOKTA.md` — endpoint, istek/cevap ve karar kuralları.

---

## 1) Bu sistemin (pms-lab) rolü

- **Ne:** Otel PMS’leri (API, MySQL, MSSQL, PostgreSQL) ile konuşan, misafir doğrulama (check-in/out) yapan bir **gateway / test ortamı**.
- **Nerede kullanılır:** Farklı otel programlarıyla (SQL veya API) test yapmak için. Atlas Hotspot’un “misafir bu odada mı, check-in mi?” sorusuna cevap verecek **orta katman** olarak düşünülebilir.

---

## 2) Genel mimari (kabaca)

```
[Atlas Hotspot]  <--->  [PMS Gateway - bu proje]  <--->  [Otel PMS]
   (WiFi/login)           (doğrulama, RADIUS)           (API / MySQL / MSSQL / PG)
```

- **Atlas Hotspot:** Kullanıcı girişi, RADIUS, MikroTik, kullanıcı arayüzü.
- **PMS Gateway (bu proje):** Tek bir yerde toplanmış “misafir doğrulama” servisi; farklı PMS türlerini (API + SQL) aynı arayüzle sunar.
- **Otel PMS:** Her otelin kendi sistemi (API veya MySQL/MSSQL/PostgreSQL).

Orta nokta: **Atlas Hotspot, sadece PMS Gateway’e “bu oda, bu kullanıcı – doğrula” der; Gateway hangi otel programına (SQL/API) gideceğine kendisi karar verir.**

---

## 3) PMS Gateway (pms-lab) bileşenleri

### 3.1) Giriş noktaları (API)

| Endpoint | Ne işe yarar |
|----------|----------------|
| `POST /api/pms/login` | Login sırasında misafir doğrulama. Tenant + oda + identity (hash) gönderilir; Gateway PMS’e sorar, **ok** (giriş izni) + RADIUS attribute’ları döner. |
| `POST /api/pms/test-verify` | Panelden/test ortamından doğrulama simülasyonu (aynı mantık, rate limit farklı). |
| `GET /api/pms/health` | Gateway + tenant sağlık kontrolü. |
| `GET /api/pms/dashboard?tenant_id=...` | İzleme: provider, circuit, cache, son doğrulamalar. |
| `POST /api/pms/settings` | Tenant ayarları (provider, DB/API bilgileri, fail_mode, unknown_mode vb.). |
| `POST /api/pms/test-connection` | Seçilen provider’a (DB veya API) bağlantı testi. |

Atlas Hotspot tarafında **asıl kullanılacak olan:** `POST /api/pms/login` (ve gerekirse health/dashboard).

### 3.2) Ortak doğrulama çıktısı (Gateway’den dönen)

Her doğrulama (login veya test-verify) sonunda Gateway şu yapıda cevap üretir:

```ts
{
  matched: boolean;        // PMS’te kayıt bulundu mu
  status: 'in_house' | 'checked_out' | 'unknown';
  valid_until?: Date;     // Checkout zamanı (varsa)
  external_ref?: string;  // Rezervasyon ID vb.
  room_number: string;
  provider: 'api' | 'mysql' | 'mssql' | 'postgres' | 'none';
  ok: boolean;            // true = girişe izin ver
  session_timeout_seconds?: number;  // RADIUS Session-Timeout için
  latency_ms: number;
  cache: 'hit' | 'miss';
}
```

Ayrıca login cevabında **RADIUS attribute’ları** da döner (Session-Timeout, Expiration formatında).  
**Orta nokta:** Atlas Hotspot bu **ok** ve **session_timeout_seconds / valid_until** değerlerine göre giriş izni verir ve RADIUS’a yazar.

### 3.3) Tenant / otel başına ayarlar (key-value)

Her otel (tenant) için Gateway’de tutulan ayar örnekleri:

- **pms_provider:** `api` | `mysql` | `mssql` | `postgres` | `none`
- **pms_fail_mode:** `deny` | `bypass` (PMS’e ulaşamazsa ne olsun)
- **pms_unknown_mode:** `deny` | `short_session` (status “unknown” gelirse)
- **pms_session_timeout_minutes:** sayı (max 1440)
- **pms_db_*** : host, port, user, password, database (SQL için)
- **pms_sql_*** : table, room_column, checkout_column, status_column, inhouse_value, vb.
- **pms_api_url**, **pms_api_key** (REST API için)

Bunlar şu an **bellekte**; kalıcı olması için Atlas Hotspot tarafında veya ortak bir DB’de tutulabilir.

### 3.4) PMS tarafları (provider’lar)

- **API:** `pms_api_url` + isteğe `pms_api_key`. Gateway `GET {url}/health`, `POST {url}/verify` çağırır. Body: room_number, name, tc, passport, identity_hash.
- **MySQL / MSSQL / PostgreSQL:** `pms_db_*` ve `pms_sql_*` ile tek tablo, parametreli sorgu. Checkout/status sütunlarına göre **in_house / checked_out / unknown** ve **valid_until** hesaplanır.

Tüm provider’lar aynı **VerifyGuestResult** formatında çıktı üretir; Atlas Hotspot sadece bu formatı bilir.

### 3.5) Diğer parçalar (kısa)

- **Circuit breaker:** 5 hata → 2 dk provider’ı devre dışı; fail_mode uygulanır.
- **Cache:** `tenantId:roomNumber:identityHash`, TTL 5 dk; sadece başarılı eşleşmeler cache’lenir.
- **Checkout job:** 10 dk’da bir; checkout olanları tespit edip RADIUS/MikroTik ile oturum kapatma (opsiyonel).
- **RADIUS:** Session-Timeout (saniye), Expiration (DD Mon YYYY HH:MM:SS).

---

## 4) Atlas Hotspot ile orta nokta (nerede buluşalım)

### 4.1) Atlas Hotspot’un yapması gerekenler (özet)

1. **Login akışında** bir noktada (RADIUS veya kendi backend’i):
   - Tenant ID (otel/şube)
   - Oda numarası
   - Kullanıcı kimliği (identity hash veya benzeri)
   - İsteğe: name, tc, passport  
   → Bunları **PMS Gateway’e** `POST /api/pms/login` ile göndermek.

2. Gelen cevaptan:
   - **ok === true** → Giriş izni ver, RADIUS’a Session-Timeout / Expiration yaz (Gateway’in döndüğü attribute’lar).
   - **ok === false** → Giriş reddet (ve gerekirse loglama).

3. (İsteğe bağlı) Tenant ayarlarını yönetmek:
   - Ya Atlas Hotspot kendi arayüzünden **POST /api/pms/settings** ile Gateway’e gönderir,
   - Ya da ayarlar Atlas’ta kalıcı tutulur, Gateway sadece “doğrulama” yapar (o zaman Gateway’in ayar kaynağı Atlas’a bağlanabilir).

### 4.2) Gateway’in beklediği (login isteği)

Örnek body:

```json
{
  "tenant_id": "otel-1",
  "room_number": "101",
  "identity_hash": "kullanici_benzersiz_deger",
  "name": "opsiyonel",
  "tc": "opsiyonel",
  "passport": "opsiyonel"
}
```

Cevap: Yukarıdaki **VerifyGuestResult** + **radius_attributes** (Session-Timeout, Expiration).

### 4.3) Ortak dil (özet tablo)

| Konu | PMS Gateway (bu proje) | Atlas Hotspot tarafı |
|------|-------------------------|----------------------|
| Kim doğrular? | Gateway, PMS’e (API/SQL) sorar | Gateway’e tek istek atar |
| Giriş kararı | `ok` + `status` + `valid_until` | `ok`’a göre izin/red + RADIUS |
| Tenant | Her otel için tenant_id | Login’de hangi otel ise o tenant_id |
| Ayarlar | Gateway’de (şu an bellek) | İstersen Atlas’ta tutulur, Gateway’e iletilir |

---

## 5) Cursor’da Atlas Hotspot prompt’unda kullanabileceğin cümleler

- “Misafir doğrulaması için **PMS Gateway API** kullanacağız. Login sırasında şu endpoint’e istek atacağız: **POST /api/pms/login** (tenant_id, room_number, identity_hash). Cevapta **ok** true ise giriş izni, **radius_attributes** ile Session-Timeout/Expiration kullanacağız. Yapı dokümantasyonu: **pms-lab/docs/YAPI_VE_ATLASHOTSPOT_BAGLANTI.md**.”
- “PMS Gateway’in döndüğü format: **matched, status, ok, valid_until, session_timeout_seconds, room_number, provider**. Atlas Hotspot bu alanlara göre giriş/red ve RADIUS kararını verecek.”

---

## 6) Klasör / proje yapısı (pms-lab – referans)

```
pms-lab/
├── src/
│   ├── types/pms.ts           # VerifyGuestResult, TenantPmsSettings, sabitler
│   ├── providers/pms/         # api, mysql, mssql, postgres, index
│   ├── services/
│   │   ├── tenant-settings.ts # Tenant ayarları (bellek)
│   │   ├── pms-verification.ts# verifyGuest, kurallar (in_house/checked_out/unknown)
│   │   ├── circuit-breaker.ts
│   │   ├── verification-cache.ts
│   │   ├── radius.ts          # Session-Timeout, Expiration format
│   │   ├── mikrotik.ts        # Hotspot oturum kapatma
│   │   └── ...
│   ├── routes/pms.ts          # /api/pms/* endpoint’leri
│   ├── app.ts
│   └── index.ts
├── public/                    # Panel (test arayüzü)
├── docs/
│   ├── OTEL_PMS_ENTEGRASYON.md
│   └── YAPI_VE_ATLASHOTSPOT_BAGLANTI.md  # bu dosya
└── ...
```

Bu yapıyı “test için farklı otel programlarıyla SQL/API deniyoruz; asıl ürün Atlas Hotspot, orada login bu Gateway’e bağlanacak” diye özetleyebilirsin. Atlas Hotspot prompt’unda bu dosyayı ve yukarıdaki endpoint + cevap formatını referans vererek orta noktada buluşabilirsin.
