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
- [Yerel API ve ngrok tüneli](#yerel-api-ve-ngrok-tüneli)
- [Geliştirme Komutları](#geliştirme-komutları)
- [Çalışma Akışları](#çalışma-akışları)
- [Auth ve Welcome akışı](#auth-ve-welcome-akışı)
- [CI/CD, Codecov ve Release](#cicd-codecov-ve-release)
- [Roadmap](#roadmap)
  - [Yol haritası](#yol-haritası)

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
  _layout.tsx          # Kök layout — SupabaseAuthProvider, Redux Provider
  index.tsx            # Splash + başlangıç yönlendirme
  (onboarding)/        # Onboarding akışı (MMKV flag ile tek seferlik)
  (auth)/              # Login, Register, ForgotPassword, Welcome
  (tabs)/              # Ana uygulama — Chat, Settings

src/
  atoms/               # Temel UI bileşenleri (Button, Input, Text, GlassView…)
  molecules/           # Birleşik bileşenler (FormField, MessageBubble, LiquidBottomSheet…)
  organisms/           # Özellik odaklı bileşenler (ChatInput, AppHeader, WelcomeAuthForm…)
  templates/           # Sayfa iskeletleri (ChatLayout…)
  screens/             # Tam ekran bileşenleri (SettingsScreen, ErrorBoundaryScreen…)
  forms/               # Zod şemaları + form tipleri (auth/welcome, auth/register…)
  hooks/
    api/               # TanStack Query hook'ları (useModels, useUpdateMe…)
    useSupabaseAuth    # Supabase auth işlemleri + token yenileme
    useI18n            # Dil değiştirme (AppLanguage tipli)
    useTheme           # Tema (ThemeMode tipli)
    useChatSession     # Streaming + mesaj yönetimi
  services/
    authService.ts     # Supabase auth wrap + AuthErrorCode mapper
    api.ts             # Axios instance (ngrok header desteği dahil)
    realm.ts           # Offline-first Realm ORM (native/.web shim)
  store/
    slices/
      authSlice        # AuthStatus, AuthState
      settingsSlice    # ThemeMode, AppLanguage (settings.types'tan)
      profileSlice     # ProfileLoadStatus (settings.types'tan)
      chatSlice        # Aktif oturum + mesaj listesi
  lib/
    mmkv.*             # Platforma göre storage shim (native/web)
    responsive.ts      # scale/verticalScale/moderateScale (web'de identity)
    offlineQueue.ts    # Realm tabanlı offline mesaj kuyruğu
    batchedUpdates.*   # React 18 web uyumlu shim
  i18n/
    en.json / tr.json  # Çeviri stringleri
  constants/           # Renk, tipografi, spacing, sabitler
  config/
    devConfig.ts       # Geliştirme önizleme bayrakları (tipli: OnboardingBackgroundVariant, NetworkPreview)
  types/
    auth.types.ts      # AuthStatus, AuthState, AuthErrorCode
    chat.types.ts      # Message, MessageRole, AttachmentType, AttachmentStatus
    chat.api.types.ts  # Stream event discriminated union'ları, arama tipleri
    user.api.types.ts  # MeResponse, UpdateMeProfileRequest
    ui.types.ts        # HapticType, NetworkPreview, OnboardingBackgroundVariant
    settings.types.ts  # AppLanguage, ThemeMode, ProfileLoadStatus
```

Kısa notlar:
- `app/`: Expo Router route katmanı — `(auth)/_layout` auth yönlendirme kararlarını yönetir
- `src/types/`: Tüm paylaşılan TypeScript tipleri; bileşen-lokal tipler kendi dosyasında kalır
- `src/services/`: API/auth/Realm gibi saf servis katmanı (React bağımlılığı yok)
- `src/lib/mmkv.*`: Platform bazlı storage shim — native `react-native-mmkv`, web `localStorage`
- `src/store/`: Redux Toolkit slice'ları; slice-lokal tipler `src/types/settings.types.ts`'ten beslenir

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

## Yerel API ve ngrok tüneli

> **Tunnel:** Docker ile Go API’niz yerelde (ör. `http://localhost:8082`) ayaktayken, fiziksel cihaz veya farklı makineden aynı backend’e ulaşmak için ngrok ile public bir HTTPS adresi açabilirsiniz. Mobil uygulamada `EXPO_PUBLIC_API_URL` değerini bu tünel URL’si yaparak `.env` / `.env.development` üzerinden lokal geliştirmeyi sürdürebilirsiniz.

**Ön koşul:** Backend konteyneri ve Go servisi çalışıyor olmalı; API’nin dinlediği port (örnekte **8082**) ngrok ile eşleşmeli.

```bash
ngrok http 8082
```

Komut çıktısındaki **Forwarding** satırındaki `https://….ngrok-free.app` (veya size verilen adres) değerini kopyalayın ve ortam dosyanızda şu şekilde kullanın:

```env
EXPO_PUBLIC_API_URL=https://xxxx.ngrok-free.app
```

- Metro’yu / uygulamayı **env değişikliğinden sonra** yeniden başlatın (Expo public env’ler build/start anında okunur).
- ngrok ücretsiz planda URL her oturumda değişebilir; değiştikçe `EXPO_PUBLIC_API_URL`’i güncellemeniz gerekir.
- Yerel makinede yalnızca simülatör/emülatör kullanıyorsanız çoğu zaman doğrudan `http://localhost:8082` yeterlidir; tünel özellikle **gerçek cihaz** veya **LAN dışı** senaryolarda işe yarar.

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

- Kök route: `app/index.tsx` — `AppSplashScreen` animasyonu bittikten sonra `navigate` çalışır.
- **Onboarding yapılmamışsa** (`STORAGE_KEYS.ONBOARDING_DONE`): `/(onboarding)`.
- **Onboarding bittiyse:** paralelde (mümkün olduğunca erken) `getCurrentSession()` çağrılır; sonuç:
  - Geçerli session varsa → `/(tabs)`.
  - Yoksa → `/(auth)/welcome`.
- Oturumlu kullanıcı için `router.replace` gecikmesi `InteractionManager` + çift `requestAnimationFrame` ile planlanır (layout zıplamasını azaltmak için).

### Onboarding

- `app/(onboarding)/` — çok adımlı onboarding.
- Tamamlanınca MMKV’de onboarding flag’i set edilir.

### Auth ve Welcome akışı

**Merkezi auth:** `SupabaseAuthProvider` (`app/_layout.tsx` içinde) + `useSupabaseAuth` / `useSupabaseAuthState`. Supabase `onAuthStateChange`, token yenileme aralığı ve `login` / `register` / `continueAsGuest` burada. Redux `authSlice` durumları: `idle` → (init sonrası) `unauthenticated` | `authenticated` | `guest` | geçici `loading` (ör. e-posta girişi sırasında `setLoading`).

**Auth grubu layout:** `app/(auth)/_layout.tsx`

- `useAuth().status` + `useSegments()`.
- Oturum **authenticated** veya **guest** iken rota `welcome` / `login` / `register` ise → `<Redirect href="/(tabs)" />` (zaten giriş yapmış kullanıcıyı ana akışa iter).
- Aksi halde → `Stack` (auth ekranları).

**Welcome ekranı:** `app/(auth)/welcome/index.tsx`

- `useAuth()` ile **UI durumları**: `idle` iken yalnızca gökyüzü gradient’i (session henüz net değil); `authenticated` / `guest` iken geçici olarak `null` (layout aynı anda `Redirect` ile `(tabs)`’a gider); `unauthenticated` / `loading` iken tam welcome (hero + form).
- İlk tam gösterimde RN `Animated` ile kısa fade-in (`WELCOME_MOUNT_FADE_DURATION_MS`).
- Üst bilgi ikonu: global `loading` veya misafir girişi beklerken soluk (`WELCOME_GUEST_AUTH_FLOW`).
- Form ve giriş mantığı **`WelcomeAuthForm`** (`src/organisms/WelcomeAuthForm.tsx`) içinde (hero her tuşta yeniden çizilmez).

**WelcomeAuthForm**

- Doğrulama: `useValidatedForm` + `welcomeLoginSchema` (`src/forms/auth/welcome/schema.ts`) — Zod, `react-hook-form`, `FormField` / `Input`.
- Giriş butonu: `formState.isSubmitting` sırasında “Giriş yapılıyor” metni + ikon.
- Başarılı e-posta girişi: `router.replace('/(tabs)')` (layout’daki `Redirect` ile uyumlu; çift yönlendirme kabul edilebilir).
- Hata: toast; yanlış şifrede alan **sıfırlanmaz** (UX).
- Misafir: toast + `continueAsGuest`, ardından `router.replace('/(tabs)')`.

**Login / Register sayfaları:** `app/(auth)/login`, `app/(auth)/register` — kendi RHF + Zod şemaları; layout aynı `Redirect` kuralına tabi.

**İleride (not):** Oturum açıldıktan sonra ayrı bir **`/me` (veya profil) API** ile Redux’u zenginleştirip öyle `replace` etmek mümkün; şu an akış doğrudan Supabase session + mevcut `replace` / `Redirect` ile home’a gider.

### Storage

- Native: `react-native-mmkv`
- Web: `localStorage` fallback (`mmkv.web.ts`)
- Realm: son `20` sohbet oturumu ve her oturumdaki son `20` mesaj lokal tutulur.
- Local Realm verisi remote kaynakla senkronize çalışır (sync akışı).

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

### Yol haritası

- **Belge ile sohbet** — PDF yükleme; sunucuda metin çıkarıp mevcut sohbet API’siyle özet ve soru-cevap.
- **Görüntü ile sohbet (vision)** — Fotoğrafı doğrudan destekleyen modellere güvenli şekilde iletme; çok modlu mesaj şeması.
- **Bilgi artırma (RAG)** — Şirket / açık veri setleriyle vektör arama; cevapları kaynaklı gösterme.
- **Yönetim paneli** — Rol, kota ve kota bypass gibi ayarların web üzerinden yönetimi (staging).
- **Görüntü üretimi** — İsteğe bağlı üretim API’si (ör. logo / illüstrasyon); sohbetten ayrı uç.
- **Model kataloğu** — Kısa açıklamalar, hangi modellerde stream / vision var bilgisi.

### Sıradakiler

- [ ] Performans ölçüm ve optimizasyon turu
- [ ] Dokümantasyon genişletme (API sözleşmeleri, ekran bazlı rehber)

---

## TODOS

- [ ] **Web — token güvenliği (XSS):** Üretim web’de access/refresh token’ları yalnızca tarayıcıda (`localStorage` / `sessionStorage` / JS bellek) tutmak XSS’te çalınabilir. Hedef mimari: oturumu **kendi backend / BFF** katmanınızdan yönetmek (ör. refresh token **httpOnly + Secure + SameSite** cookie, kısa ömürlü access token stratejisi veya sunucu tarafı session). Böylece tokenlar JS’in doğrudan okuyamayacağı kanaldan döner; XSS yüzeyi azalır. (Ayrıntılı not: `src/lib/secureStore.web.ts`.)
- [ ] Web Push için service worker kaydı ekle (`navigator.serviceWorker.register`).
- [ ] Web'de notification izin akışını ekle (`Notification.requestPermission`).
- [ ] `PushManager.subscribe` ile web subscription al (VAPID public key ile).
- [ ] Subscription bilgisini backend'e gönder ve kullanıcı ile eşle.
- [ ] Service worker içinde `push` ve `notificationclick` eventlerini handle et.
- [ ] `pushsubscriptionchange` ile subscription yenileme akışını ekle.

