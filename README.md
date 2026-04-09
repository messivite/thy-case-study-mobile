# THY Asistan (Mobile + Web)

[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-000020?logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=000)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Router](https://img.shields.io/badge/Expo%20Router-v6-black)](https://docs.expo.dev/router/introduction/)
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
- [Web Dağıtımı](#web-dağıtımı)
- [iOS Dağıtımı (Xcode)](#ios-dağıtımı-xcode)
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

Not:
- `EXPO_PUBLIC_` ile başlayan değişkenler istemci tarafında erişilebilir.
- Gizli anahtarları (`service_role` vb.) burada tutma.

---

## Geliştirme Komutları

- `npm start` -> `expo start --dev-client`
- `npm run start:go` -> `expo start` (Expo Go)
- `npm run ios` -> `expo run:ios`
- `npm run android` -> `expo run:android`
- `npm run web` -> `expo start --web`

---

## Çalışma Akışları

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

## Web Dağıtımı

Web build:

```bash
npx expo export --platform web
```

Çıktıyı (`dist/`) Vercel veya Netlify'a deploy ederek paylaşabilirsin.

---

## iOS Dağıtımı (Xcode)

EAS kullanmadan Xcode ile sürüm akışı:

1. `npx expo prebuild` (gerekiyorsa)
2. `ios/` workspace'i Xcode'da aç
3. Signing, bundle id, version/build number ayarla
4. Archive al
5. TestFlight/App Store Connect'e gönder

Not: Dev test için `npm run ios` + `npm start` akışı yeterli olur.

---

## Roadmap

> Bu bölüm sprint ilerledikçe güncellenecek.

### Tamamlananlar

- [x] Expo Router temel route mimarisi
- [x] Onboarding/Auth/Tabs akışları
- [x] Dev Client geçişi
- [x] App icon/splash/adaptive icon seti
- [x] MMKV web fallback kurgusu

### Sıradakiler

- [ ] CI/CD ve otomatik kalite kontrolleri
- [ ] E2E test kapsamı
- [ ] Gelişmiş hata izleme (Sentry vb.)
- [ ] Performans ölçüm ve optimizasyon turu
- [ ] Dokümantasyon genişletme (API sözleşmeleri, ekran bazlı rehber)

---

## Katkı ve Notlar

- Geliştirme sırasında küçük ve anlamlı commitler tercih edilir.
- Büyük değişikliklerde PR açıklamasında test adımları yazılmalıdır.
- README ve roadmap bölümleri her yeni milestone'da güncellenmelidir.

