# PMS Gateway (pms-lab) ile Orta Nokta

Bu doküman: **Atlas Hotspot** ile harici **PMS Gateway (pms-lab)** projesinin nerede buluşacağını tanımlar. Cursor'da Atlas Hotspot geliştirirken "orta noktada buluşalım" denildiğinde bu yapı referans alınır.

**Referans:** pms-lab projesindeki `docs/YAPI_VE_ATLASHOTSPOT_BAGLANTI.md` (veya eşdeğer PMS Gateway dokümantasyonu).

---

## 1) Mimari (özet)

```
[Atlas Hotspot]  ←→  [PMS Gateway - pms-lab]  ←→  [Otel PMS]
 (WiFi / login)        (doğrulama, tek API)        (API / MySQL / MSSQL / PG)
```

- **Atlas Hotspot:** Kullanıcı girişi, RADIUS, MikroTik, portal arayüzü.
- **PMS Gateway (pms-lab):** Tek giriş noktası; farklı PMS türlerini (API + SQL) aynı arayüzle sunar; doğrulama + circuit/cache.
- **Otel PMS:** Her otelin kendi sistemi.

**Orta nokta:** Atlas, sadece Gateway'e "bu tenant, bu oda, bu kimlik – doğrula" der; Gateway hangi PMS'e (SQL/API) gideceğine kendisi karar verir.

---

## 2) Atlas Hotspot'un kullanacağı endpoint

| Amaç | Endpoint | Kullanım |
|------|----------|----------|
| **Login sırasında doğrulama** | `POST /api/pms/login` | Portal otel girişinde tek istek; cevaba göre giriş izni/red + RADIUS. |
| (Opsiyonel) Sağlık | `GET /api/pms/health` | Gateway + tenant sağlık kontrolü. |
| (Opsiyonel) İzleme | `GET /api/pms/dashboard?tenant_id=...` | Provider, circuit, cache, son doğrulamalar. |

Asıl entegrasyon: **POST /api/pms/login**.

---

## 3) Login isteği (Atlas → Gateway)

Atlas Hotspot, otel girişi sırasında Gateway'e göndereceği örnek body:

```json
{
  "tenant_id": "otel-1",
  "room_number": "101",
  "identity_hash": "kullanici_benzersiz_deger",
  "name": "opsiyonel_soyad",
  "tc": "opsiyonel_tc",
  "passport": "opsiyonel_pasaport"
}
```

- **tenant_id:** Otel/şube (Gateway'deki tenant ile eşleşir).
- **room_number:** Oda numarası (zorunlu).
- **identity_hash:** Kimlik için benzersiz değer (örn. soyad+tc+pasaport hash).
- **name, tc, passport:** İsteğe bağlı; Gateway gerekirse PMS'e iletir.

---

## 4) Gateway'den dönen ortak cevap (VerifyGuestResult)

Her doğrulama sonunda Gateway aşağıdaki yapıda cevap üretir. Atlas bu alanlara göre giriş/red ve RADIUS kararını verir.

| Alan | Tip | Açıklama |
|------|-----|----------|
| **ok** | boolean | `true` = girişe izin ver |
| **matched** | boolean | PMS'te kayıt bulundu mu |
| **status** | `'in_house' \| 'checked_out' \| 'unknown'` | Konaklama durumu |
| **valid_until** | Date? | Checkout zamanı (varsa) |
| **external_ref** | string? | Rezervasyon ID vb. |
| **room_number** | string | Oda numarası |
| **provider** | string | `'api' \| 'mysql' \| 'mssql' \| 'postgres' \| 'none'` |
| **session_timeout_seconds** | number? | RADIUS Session-Timeout için (unknown + short_session) |
| **latency_ms** | number | Doğrulama süresi |
| **cache** | `'hit' \| 'miss'` | Cache'ten mi geldi |

Ayrıca login cevabında **radius_attributes** (Session-Timeout, Expiration formatında) dönebilir; Atlas bunları RADIUS'a yazar.

**Karar kuralları (Atlas tarafında):**
- `ok === false` → Giriş reddet (uygun hata mesajı).
- `ok === true` → Giriş izni ver; `session_timeout_seconds` ve/veya `radius_attributes` varsa RADIUS'a uygula.

---

## 5) Atlas Hotspot tarafında yapılacaklar (özet)

1. **Otel login akışında** (portal veya backend):
   - Tenant ID, oda numarası, identity (hash veya name/tc/passport) topla.
   - PMS **Gateway kullanılacaksa:** Gateway base URL'e `POST /api/pms/login` at; body yukarıdaki formatta.
   - Cevaptan `ok`, `session_timeout_seconds`, `radius_attributes` oku; giriş izni/red ve RADIUS yazma.

2. **Şu anki yerleşik PMS (pms.ts) ile ilişki:**
   - Atlas'ta bugün **yerleşik** PMS var (tenant_settings, SQL/API provider'lar, verifyGuest).
   - Harici Gateway kullanımı istenirse: Ayara göre (örn. `pms_use_gateway=true`) login sırasında **Gateway'e** istek atılır; cevap aynı **VerifyGuestResult** benzeri yapıda kabul edilir. Böylece "orta nokta" tek: **ok + session_timeout_seconds + radius_attributes**.

3. **Tenant ayarları:**
   - İstenirse ayarlar Atlas'ta kalır, Gateway sadece doğrulama yapar (Gateway'e sadece login isteği gider).
   - İstenirse ayarlar Gateway'e `POST /api/pms/settings` ile gönderilir; Atlas paneli Gateway'i yönetir.

---

## 6) Cursor'da kullanılabilecek referans cümleler

- "Misafir doğrulaması için **PMS Gateway API** kullanıyoruz. Login'de **POST /api/pms/login** (tenant_id, room_number, identity_hash, name?, tc?, passport?). Cevapta **ok** true ise giriş izni; **session_timeout_seconds** ve **radius_attributes** ile RADIUS'a Session-Timeout/Expiration yazıyoruz. Referans: **docs/PMS_GATEWAY_ORTA_NOKTA.md**."
- "PMS Gateway cevap formatı: **matched, status, ok, valid_until, session_timeout_seconds, room_number, provider**. Atlas bu alanlara göre giriş/red ve RADIUS kararını veriyor."

---

## 7) Ortak dil (özet tablo)

| Konu | PMS Gateway (pms-lab) | Atlas Hotspot |
|------|------------------------|----------------|
| Kim doğrular? | Gateway, PMS'e (API/SQL) sorar | Gateway'e tek istek atar |
| Giriş kararı | `ok` + `status` + `valid_until` + attributes | `ok`'a göre izin/red + RADIUS'a yazma |
| Tenant | Her otel için tenant_id | Login'de hangi otel ise o tenant_id |
| Ayarlar | Gateway'de (veya Atlas'tan iletilir) | İstersen Atlas'ta tutulur, Gateway'e iletilir |

Bu doküman, Atlas Hotspot repo'sunda PMS Gateway ile orta noktayı sabitler; pms-lab tarafındaki detaylar için pms-lab dokümantasyonuna bakılır.

---

## 8) PMS Gateway (pms-lab) tarafında tamamlanacaklar

Test sistemi doğruysa yapı **buradan (Atlas)** devam eder. Gateway tarafında aşağıdakiler tamamsa entegrasyon sorunsuz ilerler.

### Zorunlu (orta nokta için)

| Madde | Açıklama |
|-------|----------|
| **POST /api/pms/login** | Body: `tenant_id`, `room_number`, `identity_hash`; isteğe `name`, `tc`, `passport`. Cevap: `ok`, `matched`, `status`, `valid_until`, `session_timeout_seconds`, `room_number`, `provider`, `latency_ms`, `cache`; isteğe `radius_attributes` (Session-Timeout, Expiration). |
| **Cevap formatı** | Atlas sadece bu ortak yapıya bakar; Gateway hangi PMS'e giderse gitsin aynı JSON'u üretmeli. |
| **tenant_id uyumu** | Atlas'taki tenant (otel) ile Gateway'deki tenant_id aynı kavram; string veya sayı tutarlı olmalı (örn. Atlas `18` ise Gateway'de de `18` veya `"18"` kabul edilmeli). |

### İsteğe bağlı (faydalı)

| Madde | Açıklama |
|-------|----------|
| **GET /api/pms/health** | Atlas "Bağlantıyı test et" veya sağlık göstergesi için kullanabilir; 200 + basit body yeterli. |
| **Hata cevapları** | 4xx/5xx dönerken body'de `message` veya `error` olursa Atlas kullanıcıya daha anlamlı mesaj gösterebilir. |
| **test-verify benzeri** | Panelden "Doğrulama testi" ile Gateway'e de istek atılacaksa, login ile aynı body/cevap veya Gateway'deki mevcut test endpoint'i aynı contract'ı kullanmalı. |

### Eklenmesi istenen (Gateway'de)

- **Rate limit:** Login endpoint'inde istek sınırı (örn. tenant başına 60/dk) varsa kötüye kullanım azalır.
- **Timeout:** Gateway'in PMS'e yaptığı istekte timeout (örn. 5 sn); Atlas tarafında da beklenen süreyle uyumlu olsun.

Bunlar yoksa da Atlas tarafı `POST /api/pms/login` + yukarıdaki cevap formatına göre yazılabilir; diğerleri iyileştirme olur.

---

## 9) Atlas tarafında devam (buradan)

Gateway tarafı hazır olduktan sonra bu repo'da (Atlas Hotspot) yapılacaklar:

1. **Kaynak seçeneği:** Client PMS ayarlarında "REST API" seçildiğinde, isteğe bağlı "PMS Gateway kullan" (veya benzeri) ile **Gateway base URL** alanı açılabilir; bu doluysa doğrulama **Gateway'e** (`POST /api/pms/login`), değilse mevcut dahili PMS (tenant_settings + SQL/API provider) kullanılır.
2. **Portal login:** Otel modu + Gateway kullanımı açıksa, portal girişinde `tenant_id`, `room_number`, `identity_hash` (veya name/tc/passport) toplanıp Gateway'e istek atılır; cevaptaki `ok` ve `radius_attributes` / `session_timeout_seconds` ile giriş izni veya red + RADIUS yazılır.
3. **Test:** "Bağlantıyı test et" Gateway URL'ine health veya login (test) çağrısı yapabilir; "Doğrulama testi" (API/Gateway seçiliyken) aynı login contract'ı ile Gateway'e istek atıp sonucu gösterebilir.

Özet: **Gateway tarafı doğruysa** (POST /api/pms/login + cevap formatı + tenant_id uyumu), eklenmesini istediğin şeyleri (health, rate limit, timeout) orada tamamlayıp **buradan (Atlas) devam** edebilirsin; orta nokta bu dokümandaki gibi sabit.

---

## 10) Cursor'a tam yazılacak prompt'lar

Aşağıdakileri Cursor'a **olduğu gibi** kopyalayıp yapıştırabilirsin. Gerekirse `@docs/PMS_GATEWAY_ORTA_NOKTA.md` ile referans ver.

### Genel (orta nokta referansı)

```
Misafir doğrulaması için PMS Gateway API kullanıyoruz. Orta nokta dokümanı: docs/PMS_GATEWAY_ORTA_NOKTA.md

- Login'de Gateway'e POST /api/pms/login atıyoruz. Body: tenant_id, room_number, identity_hash; isteğe name, tc, passport.
- Cevapta ok === true ise giriş izni veriyoruz; session_timeout_seconds ve radius_attributes (Session-Timeout, Expiration) varsa RADIUS'a yazıyoruz. ok === false ise giriş reddediyoruz.
- Cevap formatı: matched, status, ok, valid_until, session_timeout_seconds, room_number, provider, latency_ms, cache. Atlas sadece bu alanlara göre karar veriyor.

Bu contract'a göre ilerle.
```

### Atlas'ta Gateway entegrasyonu (yapılacak iş)

```
docs/PMS_GATEWAY_ORTA_NOKTA.md bölüm 9'a göre PMS Gateway entegrasyonunu Atlas'ta yap:

1. Client PMS ayarlarına "PMS Gateway kullan" seçeneği ve Gateway base URL alanı ekle. Bu doluysa doğrulama Gateway'e POST /api/pms/login ile gitsin, değilse mevcut dahili PMS (tenant_settings + SQL/API) kullanılsın.
2. Portal otel login'de: Gateway kullanımı açıksa tenant_id, room_number, identity_hash (veya name/tc/passport) toplayıp Gateway'e istek at; cevaptaki ok ve radius_attributes / session_timeout_seconds ile giriş izni veya red + RADIUS uygula.
3. "Bağlantıyı test et" Gateway URL'ine health veya uygun test çağrısı yapsın; "Doğrulama testi" (API/Gateway seçiliyken) aynı login contract ile Gateway'e istek atıp sonucu göstersin.

Orta nokta: docs/PMS_GATEWAY_ORTA_NOKTA.md §3 (istek body), §4 (cevap formatı).
```

### Sadece login akışı

```
Portal otel girişinde PMS Gateway kullanılacak. docs/PMS_GATEWAY_ORTA_NOKTA.md'e göre:

- Tenant ID, oda numarası ve kimlik (identity_hash veya name/tc/passport) topla.
- Gateway base URL + /api/pms/login'e POST at; body JSON: tenant_id, room_number, identity_hash, name?, tc?, passport?.
- Cevaptan ok, session_timeout_seconds, radius_attributes oku. ok true ise giriş izni ver ve RADIUS'a Session-Timeout/Expiration yaz; false ise girişi reddet.
```

### Sadece test (bağlantı / doğrulama)

```
PMS ayarlarında "Bağlantıyı test et" ve "Doğrulama testi" PMS Gateway'e gitsin. docs/PMS_GATEWAY_ORTA_NOKTA.md'e göre:

- Bağlantı testi: Gateway base URL'e GET /api/pms/health (veya Gateway'in health endpoint'i) çağrısı; 200 ise ok: true.
- Doğrulama testi: Aynı base URL'e POST /api/pms/login (veya Gateway'in test-verify endpoint'i) ile tenant_id, room_number, identity_hash gönder; cevaptaki matched, status, ok, latency_ms, cache'i göster.
```
