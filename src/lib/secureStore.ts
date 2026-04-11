/**
 * Metro çözümlemesi:
 * - iOS / Android → secureStore.native.ts (Expo SecureStore)
 * - web → secureStore.web.ts (sessionStorage; ayrıntı dosya başında)
 *
 * tsc / IDE bu dosyayı okur; web bundle native modülü içermez.
 */
export { SECURE_KEYS, secureStorage } from '@/lib/secureStore.native';
