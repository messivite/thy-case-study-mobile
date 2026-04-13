# Demo & Test Rehberi

## Erişim Linkleri

| Platform | Link |
|----------|------|
| 🌐 Web | https://thy-case-study-mobile.vercel.app/ |
| 🤖 Android Release APK | https://github.com/messivite/thy-case-study-mobile/releases/tag/v0.0.6 |
| 🍎 iOS TestFlight | https://testflight.apple.com/join/qsXSAc4P |
| 🔌 Production Base Api URL | https://go-thy-case-study-backend-production.up.railway.app |
| 🔌 Production API | https://go-thy-case-study-backend-production.up.railway.app/api |
| 📖 API Swagger | https://go-thy-case-study-backend-production.up.railway.app/docs-thy-case-study-backend/ |
| 📖 Backend Side Github Repo | https://github.com/messivite/go-thy-case-study-backend |

---

## Test Hesabı

| | |
|-|---|
| E-posta | test@thycasestudy.com |
| Şifre | 123456 |

> Misafir olarak da giriş yapılabilir — e-posta ile üyede olabilirsiniz.

---

## Test Senaryoları

### 1. Temel Chat
1. Giriş yap (veya misafir olarak devam et)
2. Mesaj kutusuna bir şey yaz, gönder
3. AI yanıtı stream olarak gelir
4. Sağ üstten model değiştir, tekrar mesaj at

### 2. Sohbet Geçmişi
1. Sol üstteki menü ikonuna bas
2. Önceki sohbetler listelenir
3. Bir sohbete tıkla — mesajlar yüklenir
4. "Yeni Sohbet" butonu ile temiz başlangıç yap

### 3. Offline Sync
1. Cihazı uçak moduna al
2. Mesaj yaz ve gönder — mesaj kuyruğa alınır (sarı ikon görünür)
3. Uçak modunu kapat
4. "Bağlantı yeniden kuruldu" sheet'i açılır
5. "Senkronize et" butonuna bas — mesaj gönderilir, tamamlandı ekranı gelir

### 4. Mesaj Beğenme
1. Bir AI yanıtının altındaki beğeni ikonuna bas
2. Optimistik güncelleme anında yansır
3. Offline iken beğeni — kuyruğa alınır, online olunca sync edilir

### 5. Misafir Modu
1. Giriş ekranında "Misafir olarak devam et" seçeneğine bas
2. Kayıt olmadan chat yapılabilir
3. Sohbet geçmişi sadece yerel olarak tutulur

---

## Notlar

- Backend: Go — Railway üzerinde çalışıyor
- Desteklenen modeller: Claude (Anthropic), GPT (OpenAI), Gemini (Google)
- Offline queue: Realm tabanlı, uygulama kapatılsa bile kuyruk korunur, Sohbet mesajları ve Chat session sync
