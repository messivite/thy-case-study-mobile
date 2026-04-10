# THY Asistan (Mobile + Web)

[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-000020?logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=000)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Router](https://img.shields.io/badge/Expo%20Router-v6-black)](https://docs.expo.dev/router/introduction/)
[![Codecov coverage](https://img.shields.io/codecov/c/github/messivite/thy-case-study-mobile?logo=codecov&logoColor=white)](https://codecov.io/gh/messivite/thy-case-study-mobile)
[![Status](https://img.shields.io/badge/Status-Active-success)](#roadmap)

THY Asistan, **Expo + React Native + TypeScript** ile geliştirilen çok platformlu (iOS/Android/Web) bir uygulamadır.  
Proje; onboarding, kimlik doğrulama, asistan sohbet akışı, ayarlar, çoklu dil ve offline-first altyapı odaklı bir mimariyle ilerler.

> Bu README yaşayan bir dokümandır. Proje ilerledikçe düzenli olarak güncellenecektir.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Proje Yapısı](#proje-yapısı)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Environment Değişkenleri](#environment-değişkenleri)
- [Geliştirme Komutları](#geliştirme-komutları)
- [Çalışma Akışları](#çalışma-akışları)
- [CI/CD, Codecov ve Release](#cicd-codecov-ve-release)
- [Roadmap](#roadmap)

---

## Özellikler

- Expo Router tabanlı route yapısı (`(onboarding)`, `(auth)`, `(tabs)`)
- Splash akışı + yönlendirme (onboarding/session durumuna göre)
- Onboarding (3 adımlı akış)
- Supabase tabanlı auth altyapısı
- Zustand yerine Redux Toolkit + React Query kombinasyonu
- i18n altyapısı (TR/EN)
- MMKV (native) + web fallback storage mimarisi
- Atom/Molecule/Organism/Template katmanlarıyla bileşen mimarisi
- Web hedefi (`expo web`) + mobil native hedefler (iOS/Android)

---

## Teknoloji Yığını

- **Framework:** Expo (SDK 54), React Native 0.81
- **Language:** TypeScript
- **Routing:** Expo Router
- **State:** Redux Toolkit
- **Server State:** TanStack React Query
- **Auth & Backend:** Supabase
- **Forms/Validation:** React Hook Form + Zod
- **Animations/UI:** Reanimated, Moti, Gesture Handler
- **Storage:** react-native-mmkv (native) + localStorage fallback (web)
- **Localization:** i18next + react-i18next + expo-localization

---

## Proje Yapısı

```text
app/
  _layout.tsx
  index.tsx
  (onboarding)/
  (auth)/
  (tabs)/

src/
  atoms/
  molecules/
  organisms/
  templates/
  hooks/
  services/
  store/
  lib/
  i18n/
  constants/
  types/
```

Kısa notlar:
- `app/`: Expo Router route katmanı
- `src/services/`: API/auth/query client gibi servisler
- `src/lib/mmkv.*`: platforma göre storage shim
- `src/store/`: global store ve slice'lar

---

## Hızlı Başlangıç

### 1) Gereksinimler

- Node.js LTS
- npm
- Xcode (iOS için)
- Android Studio (Android için)

### 2) Kurulum

```bash
npm install
```

### 3) Ortam değişkenlerini tanımla

`.env` dosyasını proje kökünde oluştur ve gerekli değişkenleri ekle (aşağıdaki bölüme bak).

### 4) Geliştirme

Dev Client odaklı akış:

```bash
# native build + simulator install
npm run ios
# veya
npm run android

# ayrı terminal: metro
npm start
```

Expo Go fallback:

```bash
npm run start:go
```

Web:

```bash
npm run web
```

---

## Environment Değişkenleri

Proje içinde kullanılan public env değişkenleri:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

Not: `EXPO_PUBLIC_` ile başlayan değişkenler istemci tarafında erişilebilir.

---

## Geliştirme Komutları

- `npm start` -> `expo start --dev-client`
- `npm run start:go` -> `expo start` (Expo Go)
- `npm run ios` -> `expo run:ios`
- `npm run android` -> `expo run:android`
- `npm run web` -> `expo start --web`

---

## Çalışma Akışları

### CI/CD, Codecov ve Release

**CI (her push / PR, `main` ve `master`):** `.github/workflows/ci.yml` — `npm run typecheck`, `npm run test:ci` (coverage → `coverage/lcov.info`).

**Codecov:** Üstteki badge, repoyu [Codecov](https://codecov.io/gh/messivite/thy-case-study-mobile) ile eşledikten sonra yeşil/oran gösterir; eşleme yoksa önce boş veya hata görünebilir. İsteğe bağlı GitHub secret: `CODECOV_TOKEN`. Ayarlar: `codecov.yml`.

**Release + Android debug APK:** `.github/workflows/release.yml`

| Yöntem | Ne yaparsın |
|--------|-------------|
| Tag ile | `git tag v1.0.1 && git push origin v1.0.1` |
| Elle | GitHub → **Actions** → **Release** → **Run workflow** → branch seç → **tag** alanına örn. `v1.0.1` yaz → Run |

Release workflow’u önce test + typecheck koşar; kırmızıysa APK üretilmez. Başarılı olursa GitHub Releases üzerinde `thy-assistant-<tag>-debug.apk` eklenir.

**APK nerede üretilir ve nasıl imzalanır?**

- **CI’da:** `expo prebuild` ile oluşan `android/` içinde `./gradlew assembleDebug` çalışır. Çıktı dosyası Gradle’ın varsayılan yolu: **`android/app/build/outputs/apk/debug/app-debug.apk`** (runner’da; repoda `android/` yok, her seferinde sıfırdan üretilir).
- **Yerel:** Aynı komutla `android/app/build/outputs/apk/debug/app-debug.apk` oluşur (projede `android/` varsa).
- **İmza (bu pipeline):** `assembleDebug`, Android’in **debug imza** yapılandırmasını kullanır: genelde otomatik bir **debug keystore** (`keytool` ile oluşturulan, Gradle/Android Studio’nun bilinen `debug.keystore` ayarı). Bu **mağaza dağıtımı veya güven “production” modeli değildir**; dahili test ve demo içindir. Play Store / yayın APK veya AAB için `assembleRelease` (veya EAS) ve kendi **upload keystore** / Play App Signing sürecine geçilir.

### Splash + başlangıç yönlendirmesi

- Uygulama açılışında splash sayfası yüklenir.
- `onboardingInitial` veya onboarding state'e göre onboarding/auth/tabs yönlendirmesi yapılır.

### Onboarding

- Tek route içinde çok adımlı (slide) onboarding kurgusu vardır.
- Onboarding tamamlandığında storage'a flag yazılır.

### Auth

- Supabase session kontrolü ve auth listener merkezi olarak başlatılır.

### Storage

- Native: `react-native-mmkv`
- Web: `localStorage` fallback (`mmkv.web.ts`)

---

## Roadmap

> Bu bölüm sprint ilerledikçe güncellenecek.

### Tamamlananlar

- [x] Expo Router temel route mimarisi
- [x] Onboarding/Auth/Tabs akışları
- [x] Dev Client geçişi
- [x] App icon/splash/adaptive icon seti
- [x] MMKV web fallback kurgusu
- [x] CI/CD, test, Codecov entegrasyonu ve release (tag veya elle tetikleme + debug APK)

### Sıradakiler

- [ ] Performans ölçüm ve optimizasyon turu
- [ ] Dokümantasyon genişletme (API sözleşmeleri, ekran bazlı rehber)

---

## TODOS

- [ ] Web Push için service worker kaydı ekle (`navigator.serviceWorker.register`).
- [ ] Web'de notification izin akışını ekle (`Notification.requestPermission`).
- [ ] `PushManager.subscribe` ile web subscription al (VAPID public key ile).
- [ ] Subscription bilgisini backend'e gönder ve kullanıcı ile eşle.
- [ ] Service worker içinde `push` ve `notificationclick` eventlerini handle et.
- [ ] `pushsubscriptionchange` ile subscription yenileme akışını ekle.

