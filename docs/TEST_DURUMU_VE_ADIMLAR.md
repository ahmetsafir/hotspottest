# Şu Anki Durum ve Test Nasıl Yapılır?

## 1) Şu an ne durumdayız?

| Bileşen | Durum | Not |
|--------|--------|-----|
| **PMS Gateway (pms-lab)** | ✅ Çalışır | API, MySQL, MSSQL, PostgreSQL provider’lar hazır; doğrulama, cache, circuit breaker, RADIUS attribute’lar üretiliyor. |
| **Panel** | ✅ Çalışır | http://...:3000/panel — ayar kaydet, bağlantı test, test verify butonları; test ortamı açıklamaları var. |
| **Ayarlar** | ⚠️ Bellekte | Tenant ayarları sunucu belleğinde; PM2/uygulama restart’ta silinir. Kalıcı kayıt yok. |
| **Atlas Hotspot** | 🔜 Ayrı proje | Login akışında bu Gateway’e `POST /api/pms/login` atacak; orta nokta `PMS_GATEWAY_ORTA_NOKTA.md` ile tanımlı. |

Özet: Gateway ve panel test için hazır; gerçek test için bir PMS (MySQL/API vb.) veya mock gerekir.

---

## 2) Testi nasıl yapacağız? (3 yol)

### A) Panel üzerinden (en pratik)

1. **Uygulamayı çalıştır**
   - Yerelde: `npm run dev` veya `node dist/index.js`
   - Sunucuda: `pm2 start dist/index.js --name pms-gateway`

2. **Panele gir**
   - http://localhost:3000/panel (yerelde)
   - http://10.7.7.63:3000/panel veya sunucu IP (ağdan)

3. **Provider seç**
   - **MySQL:** Host, port, user, password, database, tablo ve sütun adlarını doldur → Ayarları kaydet → Bağlantıyı test et.
   - **API:** API URL (örn. https://pms.oteliniz.com/api) ve isteğe API Key → Ayarları kaydet → Bağlantıyı test et.

4. **Doğrulama simülasyonu**
   - Oda no (örn. 101) + Identity hash (örn. hash123) yaz → **Test verify**.
   - Sonuç aynı sayfada görünür (matched, ok, status, latency vb.).

Bu yöntem: Gerçek bir PMS (MySQL/API) varsa ona karşı test; yoksa “Bağlantıyı test et” ve “Test verify” hata verir (beklenen davranış).

---

### B) curl / Postman ile API

Gateway’in login endpoint’ini doğrudan çağır.

1. **Ayarların kayıtlı olması lazım** (önce panelden bir kez “Ayarları kaydet” yap veya `POST /api/pms/settings` ile gönder).

2. **Login (doğrulama) isteği:**
   ```bash
   curl -X POST http://localhost:3000/api/pms/login \
     -H "Content-Type: application/json" \
     -d '{"tenant_id":"tenant-1","room_number":"101","identity_hash":"hash123"}'
   ```
   Cevapta `ok`, `matched`, `status`, `radius_attributes` vb. gelir.

3. **Health:**
   ```bash
   curl "http://localhost:3000/api/pms/health?tenant_id=tenant-1"
   ```

4. **Dashboard:**
   ```bash
   curl "http://localhost:3000/api/pms/dashboard?tenant_id=tenant-1"
   ```

Bu yöntem: Atlas Hotspot’un yapacağı çağrıyı simüle eder; entegrasyon testi için uygun.

---

### C) Birim testleri (Jest)

Kurallar ve yardımcı fonksiyonlar kod içinde test edilir (gerçek DB/API yok).

```bash
cd /Users/apple/pms-lab
npm test
```

Senaryolar: in_house → ok, checked_out → red, unknown + short_session, unknown + deny, circuit breaker, cache hit, RADIUS format, MikroTik (mock).

---

## 3) Anlamlı test için ne gerekir?

| Test türü | Gereken |
|-----------|---------|
| **Panel + butonlar** | Sadece Gateway çalışıyor olsun; PMS olmasa da kaydet/test verify tıklanır, hata veya cevap görünür. |
| **Gerçek MySQL ile doğrulama** | Bir MySQL’de `reservations` benzeri tablo (room_number, checkout_at veya status); panelde MySQL seçip bilgileri girip “Bağlantıyı test et” ve “Test verify” yapılır. |
| **Gerçek API ile doğrulama** | PMS’in `/health` ve `/verify` (veya benzeri) endpoint’i; panelde API URL girilir, test edilir. |
| **Atlas Hotspot ile uçtan uca** | Atlas’ta login akışı Gateway’e `POST /api/pms/login` atacak şekilde yazılır; aynı curl örneği gibi istek atılır, cevaba göre giriş/red + RADIUS uygulanır. |

---

## 4) Hızlı test senaryosu (PMS olmadan)

1. Gateway’i başlat: `npm run dev` veya `pm2 start ...`
2. Panel: http://localhost:3000/panel
3. Tenant ID: `tenant-1`, Provider: **Yok** bırak → Ayarları kaydet.
4. Test verify: Oda 101, identity hash hash123 → **Test verify**.  
   Beklenen: `matched: false`, `ok: false` (provider yok), `provider: 'none'`.
5. Provider: **MySQL** seç, Host: `localhost`, Database: `test` (var olmayan DB) → Ayarları kaydet → Bağlantıyı test et.  
   Beklenen: Bağlantı hatası (normal).
6. Aynı ayarlarla Test verify dene: DB’ye gidilir, kayıt bulunamazsa `matched: false`, `ok: false`.

Gerçek test: Kendi MySQL’inde veya bir test API’nde doğru tablo/endpoint’leri tanımlayıp aynı adımları tekrarla; “Bağlantıyı test et” OK ve “Test verify” sonucunda `matched: true`, `ok: true` (uygun kayıt varsa) görmelisin.

---

## 5) Özet

- **Durum:** Gateway ve panel hazır; ayarlar bellekte, test için kullanılabilir.
- **Test:** (1) Panelden ayar + bağlantı test + test verify, (2) curl ile `POST /api/pms/login`, (3) `npm test` ile birim testleri.
- **Anlamlı test:** En az bir gerçek PMS (MySQL veya API) veya Atlas Hotspot’un login’de bu Gateway’i çağırması gerekir; orta nokta `docs/PMS_GATEWAY_ORTA_NOKTA.md` ile sabit.
