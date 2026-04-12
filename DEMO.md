# Demo & Test Rehberi

## Erişim Linkleri

| Platform | Link |
|----------|------|
| Web | https://thy-case-study-mobile.vercel.app/ |
| Android APK | https://github.com/messivite/thy-case-study-mobile/releases |
| iOS Demo (Video) | https://youtube.com/TODO |

---

## Test Hesabı

| | |
|-|---|
| E-posta | demo@example.com |
| Şifre | Demo1234! |

> Misafir olarak da giriş yapılabilir — kayıt gerektirmez.

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
- Desteklenen modeller: Claude (Anthropic), GPT (OpenAI)
- Offline queue: Realm tabanlı, uygulama kapatılsa bile kuyruk korunur
