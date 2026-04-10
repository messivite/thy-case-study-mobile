/**
 * mmkv.ts — Platform shim entry point
 *
 * Bu dosyayı doğrudan import et: import { storage } from '@/lib/mmkv'
 *
 * Metro resolver:
 *   iOS/Android → mmkv.native.ts  (react-native-mmkv, MMKV type)
 *   Web         → mmkv.web.ts     (localStorage wrapper, StorageLike type)
 *
 * TypeScript bu dosyayı görür; runtime'da doğru platform dosyası yüklenir.
 */

// Re-export everything from native — TypeScript type checking için.
// Web'de Metro bunu mmkv.web.ts ile override eder.
export { storage, mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv.native';
export type { MMKV } from 'react-native-mmkv';
